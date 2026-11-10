import { afterEach, describe, expect, it, vi } from "vitest";
import {
  creationFileError, creationRequest, CreationRequestError, creationFailureMessage,
  strictCreationDate, uploadCreationAttachment, validateCreationFields, prepareCreationAttempt,
  type CreationUploadState,
} from "../warranty-creation";
import { WARRANTY_DOCUMENT_ALLOWED_TYPES, WARRANTY_DOCUMENT_MAX_SIZE } from "../documents";

const fields = { productName: " جهاز ", productNameAr: "", category: "electronics", quantity: 1, startDate: "2026-11-10", endDate: "2027-11-10", sellerEmail: "" };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const file = () => new File(["synthetic document"], "proof.pdf", { type: "application/pdf" });
const prepared = {
  bucket: "warranty-documents", path: "user/warranty/unique.pdf",
  signedUrl: "https://storage.example.test/storage/v1/object/upload/sign/warranty-documents/user/warranty/unique.pdf?token=synthetic",
};

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("stable creation idempotency", () => {
  it("retains the UUID, reference and body for retries of an unchanged payload", () => {
    const reference = vi.fn(() => "WR-synthetic");
    const first = prepareCreationAttempt(null, { product_name: "synthetic" }, reference);
    const retry = prepareCreationAttempt(first, { product_name: "synthetic" }, reference);
    expect(retry).toBe(first);
    expect(first.key).toMatch(/^[0-9a-f-]{36}$/);
    expect(reference).toHaveBeenCalledTimes(1);
  });
  it("uses a new UUID only after a definitive failure and changed payload", () => {
    const first = prepareCreationAttempt(null, { product_name: "one" }, () => "WR-one");
    const changed = prepareCreationAttempt(first, { product_name: "two" }, () => "WR-two");
    expect(changed.key).not.toBe(first.key);
    expect(JSON.parse(changed.body).product_name).toBe("two");
  });
  it("freezes even changed input while the previous outcome is uncertain", () => {
    const first = prepareCreationAttempt(null, { product_name: "one" }, () => "WR-one");
    first.uncertain = true;
    expect(prepareCreationAttempt(first, { product_name: "two" }, () => "WR-two")).toBe(first);
  });
});

describe("creation field validation", () => {
  it("accepts Arabic in the primary name without requiring English", () => {
    expect(validateCreationFields(fields, 1, false)).toEqual({});
    expect(validateCreationFields(fields, 1, true)).toEqual({});
  });
  it.each([false, true])("rejects whitespace names and invalid quantities (%s)", (ar) => {
    expect(validateCreationFields({ ...fields, productName: "   ", quantity: 1.5, category: "invalid" }, 1, ar)).toMatchObject({ productName: expect.any(String), quantity: expect.any(String), category: expect.any(String) });
  });
  it.each(["", "2026-02-29", "2026-02-30", "2026-11-10T00:00:00Z", "2026-1-01"])("rejects invalid strict dates: %s", (date) => {
    expect(strictCreationDate(date)).toBe(false);
  });
  it("accepts real leap dates", () => expect(strictCreationDate("2028-02-29")).toBe(true));
  it.each(["2026-11-09", "2026-11-10"])("requires end strictly after start: %s", (endDate) => {
    expect(validateCreationFields({ ...fields, endDate }, 2, false).endDate).toBeTruthy();
  });
  it("validates optional email and provides Arabic errors", () => {
    expect(validateCreationFields(fields, 2, false)).toEqual({});
    expect(validateCreationFields({ ...fields, sellerEmail: "broken" }, 2, true).sellerEmail).toMatch(/[\u0600-\u06ff]/);
  });
});

describe("shared attachment and encoded OCR limits", () => {
  it.each(WARRANTY_DOCUMENT_ALLOWED_TYPES)("accepts exact shared MIME and 20 MiB boundary: %s", (type) => {
    expect(creationFileError({ type, size: WARRANTY_DOCUMENT_MAX_SIZE }, false)).toBeNull();
    expect(creationFileError({ type, size: WARRANTY_DOCUMENT_MAX_SIZE + 1 }, false)).toBeTruthy();
  });
  it.each(["", "image/webp", "application/octet-stream", "application/pdf;evil=1", "APPLICATION/PDF"])("rejects non-exact MIME: %s", (type) => {
    expect(creationFileError({ type, size: 10 }, false)).toBeTruthy();
  });
  it("rejects empty files and enforces encoded data URI size rather than decoded size", () => {
    expect(creationFileError({ type: "application/pdf", size: 0 }, true)).toBeTruthy();
    expect(creationFileError({ type: "application/pdf", size: 3 * 1024 * 1024 }, false, true)).toMatch(/encoded/);
    expect(creationFileError({ type: "application/pdf", size: 3 * 1024 * 1024 - 30 }, false, true)).toBeNull();
    expect(creationFileError({ type: "application/msword", size: 10 }, false, true)).toBeTruthy();
  });
});

describe("bounded requests without real network", () => {
  it("aborts a hung request, clears its timer, and never automatically retries", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() => new Promise<Response>(() => {}));
    vi.stubGlobal("fetch", fetchMock);
    const request = creationRequest("/synthetic", {}, 25);
    const rejected = expect(request).rejects.toMatchObject({ reason: "timeout" });
    await vi.advanceTimersByTimeAsync(25);
    await rejected;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("also bounds response-body reads", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: () => new Promise(() => {}) })));
    const rejected = expect(creationRequest("/synthetic", {}, 10)).rejects.toMatchObject({ reason: "timeout" });
    await vi.advanceTimersByTimeAsync(10);
    await rejected;
  });
  it.each([401, 403, 429, 500])("retains only status and safe reason for HTTP %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => reply({ error: "private file name or provider token" }, status)));
    const failure = await creationRequest("/synthetic").catch((e) => e);
    expect(failure).toMatchObject({ reason: "http", status });
    expect(creationFailureMessage(failure, false)).not.toContain("private");
    expect(creationFailureMessage(failure, true)).toMatch(/[\u0600-\u06ff]/);
  });
  it("rejects malformed JSON and oversized responses safely", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("<html>gateway</html>")).mockResolvedValueOnce(new Response("a".repeat(256 * 1024 + 1)));
    vi.stubGlobal("fetch", fetchMock);
    await expect(creationRequest("/synthetic")).rejects.toMatchObject({ reason: "response" });
    await expect(creationRequest("/synthetic")).rejects.toMatchObject({ reason: "response" });
  });
});

describe("creation attachment recovery", () => {
  it("uses the existing SDK-compatible signed PUT and finalization contract", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.example.test");
    const fetchMock = vi.fn().mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply(prepared)).mockResolvedValueOnce(reply({ Key: prepared.path })).mockResolvedValueOnce(reply({ id: "document" }));
    vi.stubGlobal("fetch", fetchMock);
    const state: CreationUploadState = {};
    await uploadCreationAttachment("warranty", file(), state);
    expect(state.done).toBe(true);
    const put = fetchMock.mock.calls[2];
    expect(put[0]).toBe(prepared.signedUrl);
    expect(put[1]).toMatchObject({ method: "PUT", headers: { "x-upsert": "false" } });
    expect(put[1].body.get("cacheControl")).toBe("3600");
    expect(put[1].body.get("")).toBeInstanceOf(File);
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toMatchObject({ storagePath: prepared.path, documentKind: "original_proof", sourceContext: "warranty_creation", fileHash: expect.stringMatching(/^[a-f0-9]{64}$/) });
    fetchMock.mockClear();
    await uploadCreationAttachment("warranty", file(), state);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("reconciles a lost finalize response without uploading or inserting again", async () => {
    const state: CreationUploadState = { prepared, uploaded: true, finalizationUncertain: true };
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => reply([{ storage_path: prepared.path }]));
    vi.stubGlobal("fetch", fetchMock);
    await uploadCreationAttachment("warranty", file(), state);
    expect(state.done).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/warranties/warranty/documents");
  });
  it("retries the same finalization when its earlier POST was never delivered", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply([])).mockRejectedValueOnce(new Error("not delivered"))
      .mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ id: "document" }));
    vi.stubGlobal("fetch", fetchMock);
    const state: CreationUploadState = { prepared, uploaded: true };
    await expect(uploadCreationAttachment("warranty", file(), state)).rejects.toMatchObject({ reason: "network" });
    expect(state.finalizationUncertain).toBe(true);
    await uploadCreationAttachment("warranty", file(), state);
    expect(state).toMatchObject({ done: true, finalizationUncertain: false, prepared, uploaded: true });
    expect(fetchMock.mock.calls[1][0]).toEqual(fetchMock.mock.calls[3][0]);
    expect(fetchMock.mock.calls[1][1].body).toEqual(fetchMock.mock.calls[3][1].body);
  });
  it("replays finalization after a lost committed response even if GET has not observed the row", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply([])).mockRejectedValueOnce(new Error("committed response lost"))
      .mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ id: "same-document", idempotent_replay: true }));
    vi.stubGlobal("fetch", fetchMock);
    const state: CreationUploadState = { prepared, uploaded: true };
    await expect(uploadCreationAttachment("warranty", file(), state)).rejects.toMatchObject({ reason: "network" });
    await uploadCreationAttachment("warranty", file(), state);
    expect(state.done).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toEqual(fetchMock.mock.calls[3][0]);
    expect(fetchMock.mock.calls[1][1].body).toEqual(fetchMock.mock.calls[3][1].body);
  });
  it.each([401, 403, 409, 429, 500, 503])("preserves the operation path after finalize HTTP %s", async (status) => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({}, status))
      .mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ id: "document" }));
    vi.stubGlobal("fetch", fetchMock);
    const state: CreationUploadState = { prepared, uploaded: true };
    await expect(uploadCreationAttachment("warranty", file(), state)).rejects.toMatchObject({ reason: "http", status });
    expect(state.prepared).toBe(prepared);
    expect(state.uploaded).toBe(true);
    await uploadCreationAttachment("warranty", file(), state);
    expect(state.done).toBe(true);
    expect(fetchMock.mock.calls[1][0]).toEqual(fetchMock.mock.calls[3][0]);
    expect(fetchMock.mock.calls[1][1].body).toEqual(fetchMock.mock.calls[3][1].body);
  });
  it("retries a timed-out finalize with the same operation and no second upload", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValueOnce(reply([])).mockImplementationOnce(() => new Promise(() => {}))
      .mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ id: "document" }));
    vi.stubGlobal("fetch", fetchMock);
    const state: CreationUploadState = { prepared, uploaded: true };
    const rejected = expect(uploadCreationAttachment("warranty", file(), state)).rejects.toMatchObject({ reason: "timeout" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await vi.advanceTimersByTimeAsync(20000);
    await rejected;
    await uploadCreationAttachment("warranty", file(), state);
    expect(state.done).toBe(true);
    expect(fetchMock.mock.calls[1][1].body).toEqual(fetchMock.mock.calls[3][1].body);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("sends overlapping finalize attempts to the same server operation", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => reply(init?.method === "POST" ? { id: "same-document" } : []));
    vi.stubGlobal("fetch", fetchMock);
    const states: CreationUploadState[] = [{ prepared, uploaded: true }, { prepared, uploaded: true }];
    await Promise.all(states.map((state) => uploadCreationAttachment("warranty", file(), state)));
    expect(states.every((state) => state.done)).toBe(true);
    const posts = fetchMock.mock.calls.filter(([, init]) => init?.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts[0][0]).toEqual(posts[1][0]);
    expect(posts[0][1]?.body).toEqual(posts[1][1]?.body);
  });
  it("does not call a successful HTTP response with missing document ID a completed attachment", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({}));
    vi.stubGlobal("fetch", fetchMock);
    const state: CreationUploadState = { prepared, uploaded: true };
    await expect(uploadCreationAttachment("warranty", file(), state)).rejects.toMatchObject({ reason: "response" });
    expect(state.done).not.toBe(true);
    expect(state.finalizationUncertain).toBe(true);
  });
  it("retains storage state across network failure and can retry without creating a warranty", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.example.test");
    const fetchMock = vi.fn().mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply(prepared)).mockRejectedValueOnce(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);
    const state: CreationUploadState = {};
    const attachment = file();
    await expect(uploadCreationAttachment("warranty", attachment, state)).rejects.toBeInstanceOf(CreationRequestError);
    expect(state.prepared).toEqual(prepared);
    fetchMock.mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ statusCode: "409", error: "Duplicate" }, 400)).mockResolvedValueOnce(reply({ id: "doc" }));
    await uploadCreationAttachment("warranty", attachment, state);
    expect(state.done).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => url === "/api/warranties")).toBe(false);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith("upload-url"))).toHaveLength(1);
  });
  it("does not trust a non-array document response or foreign signed URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://storage.example.test");
    const fetchMock = vi.fn().mockResolvedValueOnce(reply({ data: [] })).mockResolvedValueOnce(reply([])).mockResolvedValueOnce(reply({ ...prepared, signedUrl: "https://foreign.example.test/upload" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadCreationAttachment("warranty", file(), {})).rejects.toMatchObject({ reason: "response" });
    await expect(uploadCreationAttachment("warranty", file(), {})).rejects.toMatchObject({ reason: "response" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it("stops before secondary writes after an account change", async () => {
    let current = true;
    const fetchMock = vi.fn(async () => { current = false; return reply([]); });
    vi.stubGlobal("fetch", fetchMock);
    await expect(uploadCreationAttachment("warranty", file(), {}, () => current)).rejects.toMatchObject({ reason: "uncertain" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
