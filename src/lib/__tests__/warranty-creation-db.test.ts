import { beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

// These are real DB tests, never a mocked concurrency proof. They run only inside
// the disposable-stack harness, after checking its loopback identity and marker.
const isolated = process.env.WARRANTEE_ISOLATED_E2E === "1";
describe.skipIf(!isolated)("isolated transactional warranty creation", () => {
  let admin: SupabaseClient;
  let url: string;
  let anonKey: string;
  const input = { product_name: "Synthetic isolated warranty", start_date: "2026-11-10", end_date: "2027-11-10" };

  beforeAll(async () => {
    if (process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Refusing hosted database tests");
    url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const parsed = new URL(url);
    if (parsed.origin !== "http://127.0.0.1:54321" || parsed.pathname !== "/" || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error("Refusing a non-disposable database target");
    }
    anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    if (!anonKey || !serviceKey || !/^[a-f0-9]{32}$/.test(process.env.ISOLATED_RUN_ID || "")) throw new Error("Missing isolated identity");
    admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const marker = await admin.from("isolated_journey_marker").select("run_id");
    if (marker.error || marker.data?.length !== 1 || marker.data[0].run_id !== process.env.ISOLATED_RUN_ID) {
      throw new Error("Disposable backend marker mismatch");
    }
  });

  async function actor(accountType: "consumer" | "business" = "consumer", role = "creator") {
    const email = `synthetic-${randomUUID()}@example.invalid`;
    const password = `Synthetic-${randomUUID()}-test!`;
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true,
      user_metadata: { full_name: "Synthetic isolated actor", account_type: accountType } });
    expect(created.error).toBeNull();
    const id = created.data.user!.id;
    expect((await admin.from("profiles").update({ account_type: accountType }).eq("id", id)).error).toBeNull();
    const login = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await login.auth.signInWithPassword({ email, password });
    expect(signed.error).toBeNull();
    const client = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${signed.data.session!.access_token}` } } });
    let companyId: string | null = null;
    if (accountType === "business") {
      const company = await admin.from("companies").insert({ name: "Synthetic isolated issuer", company_role: "both", created_by: id }).select("id").single();
      expect(company.error).toBeNull(); companyId = company.data!.id;
      expect((await admin.from("company_members").insert({ user_id: id, company_id: companyId, role, is_active: true })).error).toBeNull();
    }
    return { id, client, companyId };
  }
  function create(client: SupabaseClient, key: string | null, body: Record<string, unknown> = input, traffic = "human") {
    return client.rpc("create_manual_warranty", { p_warranty: body, p_idempotency_key: key, p_traffic_class: traffic });
  }
  async function rows(table: string, column: string, value: string) {
    const result = await admin.from(table).select("*").eq(column, value);
    expect(result.error).toBeNull(); return result.data!;
  }
  function directInput(a: { id: string; companyId: string | null }, extra: Record<string, unknown> = {}): Record<string, unknown> {
    return { ...input, reference_number: `SYN-${randomUUID()}`, user_id: a.id, created_by: a.id,
      issuer_user_id: a.id, issuer_company_id: a.companyId, ...extra };
  }
  async function stagedDocument() {
    const a = await actor();
    const created = await create(a.client, `document-${randomUUID()}`);
    expect(created.error).toBeNull();
    const warrantyId = created.data.data.id as string;
    const path = `${a.id}/${warrantyId}/${randomUUID()}.pdf`;
    const bytes = Buffer.from("%PDF-1.4 synthetic isolated document\n%%EOF");
    expect((await a.client.storage.from("warranty-documents").upload(path, bytes,
      { contentType: "application/pdf" })).error).toBeNull();
    return { ...a, warrantyId, path, document: { warranty_id: warrantyId, file_name: "synthetic.pdf",
      file_type: "application/pdf", file_size: bytes.length, file_url: path, storage_path: path,
      file_hash: "a".repeat(64), uploaded_by: a.id, document_kind: "reference",
      evidence_metadata: { source_context: "manual_upload" } } };
  }

  it("serializes concurrent stable retries into one row, one durable outcome, and one milestone", async () => {
    const a = await actor();
    const results = await Promise.all(Array.from({ length: 8 }, () => create(a.client, "same-concurrent-key")));
    expect(results.every((result) => !result.error)).toBe(true);
    expect(new Set(results.map((result) => result.data.data.id)).size).toBe(1);
    expect(results.filter((result) => result.data.idempotent_replay === false)).toHaveLength(1);
    expect(await rows("warranties", "created_by", a.id)).toHaveLength(1);
    const records = await rows("api_idempotency_records", "user_id", a.id);
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("completed");
    expect(records[0].response_body.data.id).toBe(results[0].data.data.id);
    const events = await rows("activity_log", "actor_id", a.id);
    expect(events.filter((event) => event.action === "warranty_created")).toHaveLength(1);
    expect(events.filter((event) => event.metadata?.milestone === "first_warranty_created")).toHaveLength(1);
  });
  it("returns a newly inserted owned row without a stale same-table read-policy lookup", async () => {
    const a = await actor();
    const created = await a.client.from("warranties").insert({
      ...input, reference_number: `SYN-${randomUUID()}`, source: "qa_e2e",
      created_by: a.id, user_id: a.id, issuer_user_id: a.id,
    }).select("id,created_by").single();
    expect(created.error).toBeNull();
    expect(created.data?.created_by).toBe(a.id);
    const other = await actor();
    const foreign = await other.client.from("warranties").select("id").eq("id", created.data!.id);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toHaveLength(0);
  });
  it("emits one first milestone under concurrent different submissions", async () => {
    const a = await actor();
    const results = await Promise.all(Array.from({ length: 6 }, (_, i) => create(a.client, `distinct-concurrent-${i}`)));
    expect(results.every((result) => !result.error)).toBe(true);
    expect(await rows("warranties", "created_by", a.id)).toHaveLength(6);
    const events = await rows("activity_log", "actor_id", a.id);
    expect(events.filter((event) => event.action === "warranty_created")).toHaveLength(6);
    expect(events.filter((event) => event.action === "activation_milestone")).toHaveLength(1);
  });
  it("matches canonical body hashes, rejects mismatches, and replays the immutable original snapshot", async () => {
    const a = await actor();
    const first = await create(a.client, "snapshot-replay-key"); expect(first.error).toBeNull();
    const mismatch = await create(a.client, "snapshot-replay-key", { ...input, product_name: "Changed synthetic name" });
    expect(mismatch.error?.message).toBe("IDEMPOTENCY_BODY_MISMATCH");
    expect((await admin.from("warranties").update({ product_name: "Later synthetic edit" }).eq("id", first.data.data.id)).error).toBeNull();
    const replay = await create(a.client, "snapshot-replay-key", { end_date: input.end_date, start_date: input.start_date, product_name: input.product_name });
    expect(replay.error).toBeNull(); expect(replay.data.data).toEqual(first.data.data);
    expect(replay.data.idempotent_replay).toBe(true);
  });
  it("rolls back the reservation and events when a later insert fails", async () => {
    const a = await actor(); const body = { ...input, reference_number: `SYN-${randomUUID()}` };
    expect((await create(a.client, "rollback-first-key", body)).error).toBeNull();
    expect((await create(a.client, "rollback-failed-key", body)).error?.code).toBe("23505");
    expect(await rows("api_idempotency_records", "idempotency_key", "rollback-failed-key")).toHaveLength(0);
    expect(await rows("warranties", "created_by", a.id)).toHaveLength(1);
    expect((await rows("activity_log", "actor_id", a.id)).filter((event) => event.action === "warranty_created")).toHaveLength(1);
  });
  it("reserves funnel_event against direct authenticated forgery while genuine RPC events succeed", async () => {
    const a = await actor();
    const forged = await a.client.from("activity_log").insert({ actor_id: a.id, entity_id: a.id,
      entity_type: "funnel_event", action: "activation_milestone", metadata: { source: "server_warranty_creation", milestone: "first_warranty_created", traffic_class: "human" } });
    expect(forged.error?.code).toBe("42501");
    expect((await a.client.from("activity_log").insert({ actor_id: a.id, entity_id: a.id, entity_type: "warranty", action: "synthetic_audit" })).error).toBeNull();
    expect((await create(a.client, "authentic-backend-key")).error).toBeNull();
    expect((await rows("activity_log", "actor_id", a.id)).filter((event) => event.action === "activation_milestone")).toHaveLength(1);
    expect((await a.client.from("api_idempotency_records").select("*")).error).not.toBeNull();
  });
  it("excludes drafts and QA from activation without letting QA consume the later first human observation", async () => {
    const a = await actor();
    expect((await create(a.client, "draft-created-key", { ...input, status: "draft" })).error).toBeNull();
    expect((await create(a.client, "qa-created-key", input, "qa")).error).toBeNull();
    expect((await rows("activity_log", "actor_id", a.id)).filter((event) => event.action === "activation_milestone")).toHaveLength(0);
    expect((await create(a.client, "human-created-key")).error).toBeNull();
    const events = await rows("activity_log", "actor_id", a.id);
    expect(events.filter((event) => event.action === "activation_milestone")).toHaveLength(1);
    expect(events.some((event) => event.metadata?.source === "manual_draft")).toBe(true);
    expect(events.some((event) => event.metadata?.traffic_class === "qa")).toBe(true);
  });
  it("binds business ownership, preserves approval, and denies replay after membership revocation", async () => {
    const a = await actor("business");
    const created = await create(a.client, "business-original-key", { ...input, issuer_company_id: a.companyId, status: "active" });
    expect(created.error).toBeNull();
    expect(created.data.data).toMatchObject({ created_by: a.id, user_id: a.id, issuer_user_id: a.id, issuer_company_id: a.companyId, status: "pending_approval" });
    const events = await rows("activity_log", "entity_id", a.companyId!);
    expect(events.filter((event) => event.metadata?.milestone === "first_warranty_issued")).toHaveLength(0);
    expect((await admin.from("company_members").update({ is_active: false }).eq("user_id", a.id).eq("company_id", a.companyId)).error).toBeNull();
    const replay = await create(a.client, "business-original-key", { ...input, issuer_company_id: a.companyId, status: "active" });
    expect(replay.error?.message).toBe("ISSUER_MEMBERSHIP_REQUIRED"); expect(replay.data).toBeNull();
  });
  it("scopes the same key to each authorized tenant and refuses another actor's company", async () => {
    const a = await actor("business"); const other = await actor("business");
    expect((await admin.from("company_members").insert({ user_id: a.id, company_id: other.companyId, role: "creator", is_active: true })).error).toBeNull();
    const first = await create(a.client, "same-key-two-tenants", { ...input, issuer_company_id: a.companyId });
    const second = await create(a.client, "same-key-two-tenants", { ...input, issuer_company_id: other.companyId });
    expect(first.error).toBeNull(); expect(second.error).toBeNull();
    expect(first.data.data.id).not.toBe(second.data.data.id);
    expect(await rows("api_idempotency_records", "user_id", a.id)).toHaveLength(2);
    const forbidden = await create(other.client, "forbidden-other-tenant", { ...input, issuer_company_id: a.companyId });
    expect(forbidden.error?.message).toBe("ISSUER_MEMBERSHIP_REQUIRED");
    expect(await rows("api_idempotency_records", "idempotency_key", "forbidden-other-tenant")).toHaveLength(0);
  });
  it("records issuance only on an authorized approval transition and deduplicates repeats", async () => {
    const a = await actor("business"); const approver = await actor();
    expect((await admin.from("company_members").insert({ user_id: approver.id, company_id: a.companyId, role: "approver", is_active: true })).error).toBeNull();
    const created = await create(a.client, "approval-original-key", { ...input, issuer_company_id: a.companyId }); expect(created.error).toBeNull();
    const approval = { status: "active", approved_by: approver.id, approved_at: new Date().toISOString() };
    expect((await admin.from("warranties").update(approval).eq("id", created.data.data.id)).error).toBeNull();
    expect((await admin.from("warranties").update(approval).eq("id", created.data.data.id)).error).toBeNull();
    const events = await rows("activity_log", "entity_id", a.companyId!);
    expect(events.filter((event) => event.metadata?.milestone === "first_warranty_created")).toHaveLength(1);
    expect(events.filter((event) => event.metadata?.milestone === "first_warranty_issued")).toHaveLength(1);
  });
  it.each(["active", "claimed", "expired", "renewed"])("normalizes proof-free company direct INSERT %s to pending without issuing", async (status) => {
    const a = await actor("business");
    const inserted = await a.client.from("warranties").insert(directInput(a, { status })).select().single();
    expect(inserted.error).toBeNull();
    expect(inserted.data).toMatchObject({ status: "pending_approval", approved_at: null, approved_by: null });
  });
  it.each(["api_v1", "bulk_import:synthetic", "email_ingestion"])("preserves legacy %s company creation write shape without unapproved issuance", async (source) => {
    const a = await actor("business");
    // The quota trigger resolves company for these existing writers. Email
    // ingestion omits status; API v1/import explicitly request active.
    const body = directInput(a, { issuer_company_id: null, source });
    if (source !== "email_ingestion") body.status = "active";
    const writer = source === "bulk_import:synthetic" ? a.client : admin;
    const result = await writer.from("warranties").insert(body).select().single();
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({ issuer_company_id: a.companyId, status: "pending_approval", approved_by: null, approved_at: null });
  });
  it("rejects creator direct activation and forged/partial proof on INSERT and UPDATE", async () => {
    const a = await actor("business"); const approver = await actor();
    expect((await admin.from("company_members").insert({ company_id: a.companyId, user_id: approver.id,
      role: "approver", is_active: true })).error).toBeNull();
    const created = await create(a.client, "creator-cannot-activate", { ...input, issuer_company_id: a.companyId });
    expect(created.error).toBeNull();
    for (const proof of [{}, { approved_by: a.id }, { approved_at: new Date().toISOString() },
      { approved_by: a.id, approved_at: new Date().toISOString() },
      { approved_by: approver.id, approved_at: new Date().toISOString() }]) {
      const updated = await a.client.from("warranties").update({ status: "active", ...proof }).eq("id", created.data.data.id);
      expect(updated.error?.code).toBe("42501");
      if (Object.keys(proof).length) {
        const inserted = await a.client.from("warranties").insert(directInput(a, { status: "active", ...proof }));
        expect(inserted.error?.code).toBe("42501");
      }
    }
    expect((await rows("warranties", "id", created.data.data.id))[0].status).toBe("pending_approval");
    expect(await rows("warranties", "created_by", a.id)).toHaveLength(1);
  });
  it.each(["viewer", "creator", "approver", "company_admin", "platform_admin"])("keeps company role %s approval authority unchanged", async (role) => {
    const a = await actor("business"); const candidate = await actor();
    expect((await admin.from("company_members").insert({ company_id: a.companyId, user_id: candidate.id,
      role, is_active: true })).error).toBeNull();
    const created = await create(a.client, `role-approval-${role}`, { ...input, issuer_company_id: a.companyId });
    expect(created.error).toBeNull();
    const result = await candidate.client.from("warranties").update({ status: "active", approved_by: candidate.id,
      approved_at: new Date().toISOString() }).eq("id", created.data.data.id).select("id");
    const allowed = ["approver", "company_admin", "platform_admin"].includes(role);
    if (allowed) { expect(result.error).toBeNull(); expect(result.data).toHaveLength(1); }
    else expect(result.error?.code === "42501" || result.data?.length === 0).toBe(true);
    expect((await rows("warranties", "id", created.data.data.id))[0].status).toBe(allowed ? "active" : "pending_approval");
  });
  it.each(["admin", "super_admin", "platform_admin"])("preserves profile %s approval without adding company membership", async (role) => {
    const a = await actor("business"); const approver = await actor();
    expect((await admin.from("profiles").update({ role }).eq("id", approver.id)).error).toBeNull();
    const created = await create(a.client, `platform-approval-${role}`, { ...input, issuer_company_id: a.companyId });
    expect(created.error).toBeNull();
    const result = await approver.client.from("warranties").update({ status: "active", approved_by: approver.id,
      approved_at: new Date().toISOString() }).eq("id", created.data.data.id).select("id");
    expect(result.error).toBeNull(); expect(result.data).toHaveLength(1);
    expect(await rows("company_members", "user_id", approver.id)).toHaveLength(0);
  });
  it("preserves authorized direct active insertion with matching proof, but rejects insertion without full proof", async () => {
    const a = await actor("business", "approver");
    const result = await a.client.from("warranties").insert(directInput(a, { status: "active",
      approved_by: a.id, approved_at: new Date().toISOString() })).select().single();
    expect(result.error).toBeNull(); expect(result.data.status).toBe("active");
    const partial = await a.client.from("warranties").insert(directInput(a, { status: "active", approved_by: a.id }));
    expect(partial.error?.code).toBe("42501");
  });
  it("denies service approvals using a creator, revoked approver, other-tenant approver, or archived company", async () => {
    const a = await actor("business"); const other = await actor("business", "approver");
    const revoked = await actor();
    expect((await admin.from("company_members").insert({ company_id: a.companyId, user_id: revoked.id,
      role: "approver", is_active: false })).error).toBeNull();
    const created = await create(a.client, "service-proof-revalidate", { ...input, issuer_company_id: a.companyId });
    expect(created.error).toBeNull();
    for (const approved_by of [a.id, other.id, revoked.id]) {
      const results = await Promise.all(Array.from({ length: 3 }, () => admin.from("warranties").update({
        status: "active", approved_by, approved_at: new Date().toISOString(),
      }).eq("id", created.data.data.id)));
      expect(results.every((result) => result.error?.code === "42501")).toBe(true);
    }
    expect((await admin.from("company_members").update({ is_active: true }).eq("user_id", revoked.id)).error).toBeNull();
    expect((await admin.from("companies").update({ is_archived: true }).eq("id", a.companyId)).error).toBeNull();
    const archived = await admin.from("warranties").update({ status: "active", approved_by: revoked.id,
      approved_at: new Date().toISOString() }).eq("id", created.data.data.id);
    expect(archived.error?.code).toBe("42501");
    expect((await rows("warranties", "id", created.data.data.id))[0].status).toBe("pending_approval");
  });
  it("serializes concurrent service approval compare-and-set into one authorized issuance", async () => {
    const a = await actor("business", "approver");
    const created = await create(a.client, "concurrent-real-approval", { ...input, issuer_company_id: a.companyId });
    expect(created.error).toBeNull();
    const approval = { status: "active", approved_by: a.id, approved_at: new Date().toISOString() };
    const results = await Promise.all(Array.from({ length: 8 }, () => admin.from("warranties").update(approval)
      .eq("id", created.data.data.id).eq("status", "pending_approval").select("id")));
    expect(results.every((result) => !result.error)).toBe(true);
    expect(results.filter((result) => result.data?.length === 1)).toHaveLength(1);
    expect((await rows("activity_log", "entity_id", a.companyId!))
      .filter((event) => event.metadata?.milestone === "first_warranty_issued")).toHaveLength(1);
  });
  it("prevents issuer stripping and proof tampering while preserving approved lifecycle and ordinary edits", async () => {
    const a = await actor("business"); const approver = await actor();
    expect((await admin.from("company_members").insert({ company_id: a.companyId, user_id: approver.id,
      role: "approver", is_active: true })).error).toBeNull();
    const created = await create(a.client, "proof-integrity-lifecycle", { ...input, issuer_company_id: a.companyId });
    expect(created.error).toBeNull();
    expect((await a.client.from("warranties").update({ issuer_company_id: null, status: "active" })
      .eq("id", created.data.data.id)).error?.message).toBe("WARRANTY_ISSUER_IMMUTABLE");
    const approval = { status: "active", approved_by: approver.id, approved_at: new Date().toISOString() };
    expect((await admin.from("warranties").update(approval).eq("id", created.data.data.id)).error).toBeNull();
    expect((await a.client.from("warranties").update({ product_name: "Edited synthetic approved record" })
      .eq("id", created.data.data.id)).error).toBeNull();
    for (const proof of [{ approved_by: null }, { approved_at: null }, { approved_by: a.id },
      { approved_at: "2020-01-01T00:00:00Z" }]) {
      expect((await a.client.from("warranties").update(proof).eq("id", created.data.data.id)).error?.code).toBe("42501");
    }
    for (const status of ["claimed", "active", "expired", "renewed", "active"]) {
      expect((await admin.from("warranties").update({ status }).eq("id", created.data.data.id)).error).toBeNull();
    }
    expect((await rows("warranties", "id", created.data.data.id))[0]).toMatchObject({
      issuer_company_id: a.companyId, approved_by: approver.id, status: "active",
    });
  });
  it("keeps personal active creation and draft activation unchanged", async () => {
    const a = await actor();
    const result = await a.client.from("warranties").insert(directInput(a, { status: "draft" })).select().single();
    expect(result.error).toBeNull();
    expect((await a.client.from("warranties").update({ status: "active" }).eq("id", result.data.id)).error).toBeNull();
    expect((await rows("warranties", "id", result.data.id))[0].status).toBe("active");
  });
  it("finalizes eight concurrent metadata attempts into one row and one atomic audit", async () => {
    const a = await stagedDocument();
    const results = await Promise.all(Array.from({ length: 8 }, () =>
      a.client.rpc("finalize_warranty_document", { p_document: a.document })));
    expect(results.every((result) => !result.error)).toBe(true);
    expect(new Set(results.map((result) => result.data.data.id)).size).toBe(1);
    expect(results.filter((result) => !result.data.idempotent_replay)).toHaveLength(1);
    const documents = await rows("warranty_documents", "warranty_id", a.warrantyId);
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({ uploaded_by: a.id, storage_path: a.path, security_status: "pending_scan", provenance_status: "recorded" });
    expect((await rows("activity_log", "entity_id", documents[0].id)).filter((event) => event.action === "document_uploaded")).toHaveLength(1);
  });
  it("replays stored document and scanner state after lost response without caller metadata overwrites", async () => {
    const a = await stagedDocument();
    const first = await a.client.rpc("finalize_warranty_document", { p_document: a.document });
    expect(first.error).toBeNull();
    expect((await admin.from("warranty_documents").update({ security_status: "blocked",
      security_metadata: { scanner: "synthetic", state: "blocked" } }).eq("id", first.data.data.id)).error).toBeNull();
    const replay = await a.client.rpc("finalize_warranty_document", { p_document: {
      ...a.document, uploaded_at: "2000-01-01T00:00:00Z", evidence_metadata: { source_context: "forged_retry" },
    } });
    expect(replay.error).toBeNull();
    expect(replay.data).toMatchObject({ idempotent_replay: true, data: { id: first.data.data.id, security_status: "blocked",
      evidence_metadata: { source_context: "manual_upload" }, uploaded_at: first.data.data.uploaded_at } });
    expect(await rows("warranty_documents", "warranty_id", a.warrantyId)).toHaveLength(1);
  });
  it("rejects mismatched immutable document metadata and unsafe security claims without duplicating rows", async () => {
    const a = await stagedDocument();
    expect((await a.client.rpc("finalize_warranty_document", { p_document: a.document })).error).toBeNull();
    for (const changed of [{ file_hash: "b".repeat(64) }, { file_size: 99 }, { file_name: "different.pdf" }, { document_kind: "certificate" }]) {
      const result = await a.client.rpc("finalize_warranty_document", { p_document: { ...a.document, ...changed } });
      expect(result.error?.message).toBe("DOCUMENT_BODY_MISMATCH");
    }
    const unsafe = await a.client.rpc("finalize_warranty_document", { p_document: { ...a.document, security_status: "clean" } });
    expect(unsafe.error?.message).toBe("INVALID_DOCUMENT_INPUT");
    expect(await rows("warranty_documents", "warranty_id", a.warrantyId)).toHaveLength(1);
  });
  it("denies cross-user warranty/path access and uploader spoofing", async () => {
    const a = await stagedDocument(); const other = await actor();
    const foreign = await other.client.rpc("finalize_warranty_document", { p_document: a.document });
    expect(foreign.error?.code).toBe("42501");
    const foreignPath = `${other.id}/${a.warrantyId}/synthetic.pdf`;
    const hidden = await other.client.rpc("finalize_warranty_document", { p_document: { ...a.document,
      uploaded_by: other.id, storage_path: foreignPath, file_url: foreignPath } });
    expect(hidden.error?.code).toBe("42501");
    const wrongPath = await a.client.rpc("finalize_warranty_document", { p_document: { ...a.document,
      storage_path: `${a.id}/${a.warrantyId}/../synthetic.pdf` } });
    expect(wrongPath.error?.message).toBe("INVALID_STORAGE_PATH");
    expect(await rows("warranty_documents", "warranty_id", a.warrantyId)).toHaveLength(0);
  });
  it("leaves no metadata or audit when the staged object is absent", async () => {
    const a = await stagedDocument();
    expect((await admin.storage.from("warranty-documents").remove([a.path])).error).toBeNull();
    const result = await a.client.rpc("finalize_warranty_document", { p_document: a.document });
    expect(result.error?.message).toBe("STORAGE_OBJECT_NOT_FOUND");
    expect(await rows("warranty_documents", "warranty_id", a.warrantyId)).toHaveLength(0);
    expect((await rows("activity_log", "actor_id", a.id)).filter((event) => event.action === "document_uploaded")).toHaveLength(0);
  });
  it.each([
    { user_id: "11111111-1111-4111-8111-111111111111" }, { created_by: "spoof" }, { approved_by: "spoof" },
    { source: "manual_with_documents" }, { role: "platform_admin" }, { product_name: "x".repeat(201) },
    { product_name: [] }, { description: {} }, { quantity: 1.1 }, { quantity: -1 },
    { purchase_price: "10" }, { language: "xx" }, { end_date: "2026-01-01" }, { status: "cancelled" },
  ])("validates direct RPC payloads rather than trusting HTTP validation: %j", async (invalid) => {
    const a = await actor();
    const result = await create(a.client, `invalid-${randomUUID()}`, { ...input, ...invalid });
    expect(result.error).not.toBeNull(); expect(result.data).toBeNull();
    expect(await rows("warranties", "created_by", a.id)).toHaveLength(0);
    expect(await rows("api_idempotency_records", "user_id", a.id)).toHaveLength(0);
  });
});
