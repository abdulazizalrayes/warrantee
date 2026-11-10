import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  auth: vi.fn(), rpc: vi.fn(), access: vi.fn(), list: vi.fn(),
  remove: vi.fn(), authorized: true, reads: [] as { method: string; args: unknown[] }[],
}));
const ACTOR = "11111111-1111-4111-8111-111111111111";
const WARRANTY = "22222222-2222-4222-8222-222222222222";
const DOCUMENT = "33333333-3333-4333-8333-333333333333";
const PATH = `${ACTOR}/${WARRANTY}/synthetic-proof.pdf`;
const HASH = "a".repeat(64);

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser: state.auth }, rpc: state.rpc,
    storage: { from: () => ({ remove: state.remove }) },
    from: (table: string) => {
      if (table !== "warranties") throw new Error("Direct metadata/audit writes or dedupe reads forbidden");
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "or"]) {
        query[method] = (...args: unknown[]) => { state.reads.push({ method, args }); return query; };
      }
      query.single = async () => ({ data: state.authorized ? { id: WARRANTY } : null, error: null });
      return query;
    },
  }),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    storage: { from: (bucket: string) => {
      expect(bucket).toBe("warranty-documents");
      return { list: state.list };
    } },
    rpc: () => { throw new Error("Privileged finalization forbidden"); },
    from: () => { throw new Error("Privileged data access forbidden"); },
  }),
}));
vi.mock("@/lib/warranty-access", () => ({ resolveWarrantyAccessOrClause: state.access }));

import { POST } from "@/app/api/warranties/[id]/documents/route";

const payload = {
  storagePath: PATH, fileName: "synthetic-proof.pdf", fileType: "application/pdf", fileSize: 128,
  fileHash: HASH, documentKind: "original_proof", sourceContext: "warranty_creation",
};
const stored = {
  id: DOCUMENT, warranty_id: WARRANTY, storage_path: PATH, file_url: PATH, file_hash: HASH,
  file_name: payload.fileName, file_type: payload.fileType, file_size: payload.fileSize,
  uploaded_by: ACTOR, uploaded_at: "2026-11-10T12:00:00.000Z", document_kind: "original_proof",
  provenance_status: "recorded", security_status: "pending_scan",
  security_metadata: { scanner: "not_configured", state: "queued" },
  evidence_metadata: { source_context: "warranty_creation" },
};
function request(body: unknown = payload) {
  return new NextRequest(`https://unit-test.invalid/api/warranties/${WARRANTY}/documents`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
}
function finalize(body: unknown = payload) {
  return POST(request(body), { params: Promise.resolve({ id: WARRANTY }) });
}

beforeEach(() => {
  vi.resetAllMocks();
  state.authorized = true; state.reads = [];
  state.auth.mockResolvedValue({ data: { user: { id: ACTOR } }, error: null });
  state.access.mockResolvedValue(`created_by.eq.${ACTOR}`);
  state.list.mockResolvedValue({ data: [{ name: "synthetic-proof.pdf" }], error: null });
  state.rpc.mockResolvedValue({ data: { data: stored, idempotent_replay: false }, error: null });
});

describe("signed attachment finalization boundary", () => {
  it("uses one session-bound atomic RPC, preserving queued scanner/provenance metadata", async () => {
    const response = await finalize({ ...payload, uploaded_by: "victim", security_status: "clean", provenance_status: "verified" });
    expect(response.status).toBe(201);
    expect(state.rpc).toHaveBeenCalledExactlyOnceWith("finalize_warranty_document", {
      p_document: {
        warranty_id: WARRANTY, file_name: payload.fileName, file_type: payload.fileType, file_size: 128,
        file_url: PATH, storage_path: PATH, file_hash: HASH, uploaded_by: ACTOR,
        document_kind: "original_proof", provenance_status: "recorded", security_status: "pending_scan",
        security_metadata: { scanner: "not_configured", state: "queued" },
        evidence_metadata: { source_context: "warranty_creation", original_file_name: payload.fileName, content_type: payload.fileType, bytes: 128 },
      },
    });
    expect(state.list).toHaveBeenCalledWith(`${ACTOR}/${WARRANTY}`, { limit: 1, search: "synthetic-proof.pdf" });
    expect(state.reads).toContainEqual({ method: "eq", args: ["id", WARRANTY] });
    expect(state.reads).toContainEqual({ method: "or", args: [`created_by.eq.${ACTOR}`] });
    expect(await response.json()).toMatchObject({ id: DOCUMENT, idempotent_replay: false,
      provenance: { security_status: "pending_scan", uploaded_at: stored.uploaded_at, file_hash: HASH } });
    expect(state.remove).not.toHaveBeenCalled();
  });

  it.each(["unauthenticated", "auth-error", "inaccessible"])("rejects %s before storage or RPC access", async (kind) => {
    if (kind === "unauthenticated") state.auth.mockResolvedValue({ data: { user: null }, error: null });
    if (kind === "auth-error") state.auth.mockResolvedValue({ data: { user: { id: ACTOR } }, error: { message: "expired" } });
    if (kind === "inaccessible") state.authorized = false;
    expect((await finalize()).status).toBe(401);
    expect(state.rpc).not.toHaveBeenCalled(); expect(state.list).not.toHaveBeenCalled();
  });

  it.each([
    `other/${WARRANTY}/proof.pdf`, `${ACTOR}/other/proof.pdf`, `/${PATH}`,
    `${ACTOR}/${WARRANTY}/../proof.pdf`, `${ACTOR}/${WARRANTY}/nested\\proof.pdf`,
  ])("rejects unsafe or cross-tenant path %s", async (storagePath) => {
    expect((await finalize({ ...payload, storagePath })).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled(); expect(state.list).not.toHaveBeenCalled();
  });

  it.each([
    { fileType: "application/octet-stream" }, { fileSize: 0 }, { fileSize: 20 * 1024 * 1024 + 1 },
    { fileHash: "not-a-sha256" },
  ])("preserves attachment validation %j", async (invalid) => {
    expect((await finalize({ ...payload, ...invalid })).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled(); expect(state.list).not.toHaveBeenCalled();
  });

  it.each(["absent", "similar-name", "lookup-error"])("fails closed for storage %s", async (kind) => {
    state.list.mockResolvedValue({ data: kind === "similar-name" ? [{ name: "synthetic-proof.pdf.extra" }] : [],
      error: kind === "lookup-error" ? { message: "private storage details" } : null });
    expect((await finalize()).status).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled(); expect(state.remove).not.toHaveBeenCalled();
  });

  it("returns stored replay provenance without overwriting later scanner decisions", async () => {
    state.rpc.mockResolvedValue({ data: { data: { ...stored, security_status: "blocked",
      document_kind: "reference", evidence_metadata: { source_context: "original_source" } }, idempotent_replay: true }, error: null });
    const response = await finalize({ ...payload, documentKind: "reference" });
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ id: DOCUMENT, security_status: "blocked", idempotent_replay: true,
      provenance: { security_status: "blocked", document_kind: "reference", source_context: "original_source", uploaded_at: stored.uploaded_at } });
    expect(state.remove).not.toHaveBeenCalled();
  });

  it.each([
    ["PGRST202", "missing RPC private details", 503], ["42883", "missing SQL function", 503],
    ["42501", "private membership details", 403], ["P0001", "DOCUMENT_BODY_MISMATCH", 409],
    ["P0001", "INVALID_DOCUMENT_INPUT", 400], ["P0001", "INVALID_STORAGE_PATH", 400],
    ["P0001", "STORAGE_OBJECT_NOT_FOUND", 400], ["XX000", "private database failure", 500],
  ])("handles RPC %s/%s without fallback insert or object deletion", async (code, message, status) => {
    state.rpc.mockResolvedValue({ data: null, error: { code, message } });
    const response = await finalize();
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "Could not confirm document finalization" });
    expect(state.rpc).toHaveBeenCalledOnce(); expect(state.remove).not.toHaveBeenCalled();
  });

  it.each([null, {}, { data: {} }, { data: { id: "" } }])("does not accept a missing durable outcome %j", async (data) => {
    state.rpc.mockResolvedValue({ data, error: null });
    expect((await finalize()).status).toBe(503);
    expect(state.remove).not.toHaveBeenCalled();
  });
});

describe("finalization retry transport (mock RPC, not database concurrency proof)", () => {
  it("retries the identical operation after failure before database delivery", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "NETWORK", message: "before delivery" } });
    expect((await finalize()).status).toBe(500);
    expect((await finalize()).status).toBe(201);
    expect(state.rpc.mock.calls[0]).toEqual(state.rpc.mock.calls[1]);
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("preserves the object when the DB committed but the response was lost", async () => {
    state.rpc.mockResolvedValueOnce({ data: null, error: { code: "NETWORK", message: "response lost after commit" } })
      .mockResolvedValueOnce({ data: { data: stored, idempotent_replay: true }, error: null });
    expect((await finalize()).status).toBe(500);
    const retry = await finalize();
    expect(await retry.json()).toMatchObject({ id: DOCUMENT, idempotent_replay: true });
    expect(state.rpc.mock.calls[0]).toEqual(state.rpc.mock.calls[1]);
    expect(state.remove).not.toHaveBeenCalled();
  });

  it("passes concurrent identical finalizations through the same atomic RPC contract", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let delivered = 0;
    state.rpc.mockImplementation(async () => {
      const first = delivered++ === 0;
      if (delivered === 8) release();
      await gate;
      return { data: { data: stored, idempotent_replay: !first }, error: null };
    });
    const responses = await Promise.all(Array.from({ length: 8 }, () => finalize()));
    const bodies = await Promise.all(responses.map((response) => response.json()));
    expect(responses.every((response) => response.status === 201)).toBe(true);
    expect(new Set(bodies.map((body) => body.id))).toEqual(new Set([DOCUMENT]));
    expect(bodies.filter((body) => !body.idempotent_replay)).toHaveLength(1);
    expect(state.rpc).toHaveBeenCalledTimes(8);
    for (const call of state.rpc.mock.calls) expect(call).toEqual(state.rpc.mock.calls[0]);
    expect(state.remove).not.toHaveBeenCalled();
  });
});
