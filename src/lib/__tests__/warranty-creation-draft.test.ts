import { describe, expect, it } from "vitest";
import { clearCreationDraftStorage, CREATION_DRAFT_KEY, CREATION_DRAFT_TTL, loadCreationDraft, saveCreationDraft, type CreationDraft } from "../warranty-creation-draft";

function storage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
const now = 1000000;
const draft: CreationDraft = { accountId: "synthetic-account", expiresAt: now + CREATION_DRAFT_TTL, step: 1, productName: "", productNameAr: "", category: "electronics", quantity: 1, startDate: "", endDate: "", savedWarrantyId: null, pendingCreation: false, pendingAttachments: false };

describe("explicit tab-scoped creation drafts", () => {
  it("permits incomplete drafts locally without requiring a database row", () => {
    const tab = storage();
    expect(tab.getItem(CREATION_DRAFT_KEY)).toBeNull();
    expect(saveCreationDraft(tab, draft)).toBe(true);
    expect(loadCreationDraft(tab, draft.accountId, now)).toEqual(draft);
  });
  it("projects only allowed fields, never files, OCR, contacts or document clauses", () => {
    const tab = storage();
    saveCreationDraft(tab, { ...draft, productName: "x".repeat(500), files: ["raw bytes"], text: "raw OCR", sellerEmail: "private@example.test", termsAndConditions: "document body", unknown: "private" } as CreationDraft);
    const raw = tab.getItem(CREATION_DRAFT_KEY)!;
    expect(raw).not.toMatch(/raw bytes|raw OCR|private|document body|termsAndConditions|files/);
    expect(loadCreationDraft(tab, draft.accountId, now)?.productName).toHaveLength(200);
  });
  it("deletes another account's draft rather than exposing or retaining it", () => {
    const tab = storage(); saveCreationDraft(tab, draft);
    expect(loadCreationDraft(tab, "different-account", now)).toBeNull();
    expect(tab.getItem(CREATION_DRAFT_KEY)).toBeNull();
  });
  it("expires at the fixed short TTL and rejects implausible extended expiry", () => {
    const tab = storage(); saveCreationDraft(tab, draft);
    expect(loadCreationDraft(tab, draft.accountId, draft.expiresAt)).toBeNull();
    saveCreationDraft(tab, { ...draft, expiresAt: now + CREATION_DRAFT_TTL + 1 });
    expect(loadCreationDraft(tab, draft.accountId, now)).toBeNull();
  });
  it("does not share drafts between tab storage instances", () => {
    const first = storage(); saveCreationDraft(first, draft);
    expect(loadCreationDraft(storage(), draft.accountId, now)).toBeNull();
  });
  it("retains a saved ID and marks an uncertain pre-reload save without storing request bodies", () => {
    const tab = storage(); const savedWarrantyId = "00000000-0000-4000-8000-000000000001";
    saveCreationDraft(tab, { ...draft, savedWarrantyId, pendingAttachments: true });
    expect(loadCreationDraft(tab, draft.accountId, now)?.savedWarrantyId).toBe(savedWarrantyId);
    saveCreationDraft(tab, { ...draft, pendingCreation: true });
    expect(loadCreationDraft(tab, draft.accountId, now)?.pendingCreation).toBe(true);
    expect(tab.getItem(CREATION_DRAFT_KEY)).not.toContain("body");
  });
  it.each(["{invalid", "x".repeat(4097), JSON.stringify({ ...draft, step: 4 }), JSON.stringify({ ...draft, savedWarrantyId: "../wrong" })])("rejects malformed or unbounded stored state", (raw) => {
    const tab = storage(); tab.setItem(CREATION_DRAFT_KEY, raw);
    expect(loadCreationDraft(tab, draft.accountId, now)).toBeNull();
    expect(tab.getItem(CREATION_DRAFT_KEY)).toBeNull();
  });
  it("supports explicit discard and disabled storage without throwing", () => {
    const tab = storage(); saveCreationDraft(tab, draft); clearCreationDraftStorage(tab);
    expect(tab.getItem(CREATION_DRAFT_KEY)).toBeNull();
    expect(saveCreationDraft(null, draft)).toBe(false);
    expect(loadCreationDraft(null, draft.accountId)).toBeNull();
    expect(saveCreationDraft({ setItem() { throw new Error("disabled"); } }, draft)).toBe(false);
    expect(() => clearCreationDraftStorage({ removeItem() { throw new Error("disabled"); } })).not.toThrow();
  });
});
