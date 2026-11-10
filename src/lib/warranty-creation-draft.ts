import { isValidUUID } from "./validation";

export const CREATION_DRAFT_KEY = "warrantee:creation-draft:v1";
export const CREATION_DRAFT_TTL = 30 * 60 * 1000;
export const CREATION_DRAFT_MAX_LENGTH = 4096;

// Deliberately exclude seller contacts, serials, references, clauses, OCR and files.
export type CreationDraft = {
  accountId: string; expiresAt: number; step: 1 | 2 | 3;
  productName: string; productNameAr: string; category: string; quantity: number;
  startDate: string; endDate: string;
  savedWarrantyId: string | null; pendingCreation: boolean; pendingAttachments: boolean;
};

export function creationDraftStorage(): Storage | null {
  try { return window.sessionStorage; } catch { return null; }
}

export function clearCreationDraftStorage(storage: Pick<Storage, "removeItem"> | null) {
  try { storage?.removeItem(CREATION_DRAFT_KEY); } catch { /* Storage can be disabled. */ }
}

export function saveCreationDraft(storage: Pick<Storage, "setItem"> | null, draft: CreationDraft) {
  if (!storage) return false;
  const safe: CreationDraft = {
    accountId: draft.accountId, expiresAt: draft.expiresAt, step: draft.step,
    productName: draft.productName.slice(0, 200), productNameAr: draft.productNameAr.slice(0, 200),
    category: draft.category.slice(0, 40), quantity: Number.isSafeInteger(draft.quantity) ? draft.quantity : 1,
    startDate: draft.startDate.slice(0, 10), endDate: draft.endDate.slice(0, 10),
    savedWarrantyId: draft.savedWarrantyId, pendingCreation: draft.pendingCreation,
    pendingAttachments: draft.pendingAttachments,
  };
  try {
    const value = JSON.stringify(safe);
    if (value.length > CREATION_DRAFT_MAX_LENGTH) return false;
    storage.setItem(CREATION_DRAFT_KEY, value);
    return true;
  } catch { return false; }
}

export function loadCreationDraft(storage: Pick<Storage, "getItem" | "removeItem"> | null, accountId: string, now = Date.now()): CreationDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CREATION_DRAFT_KEY);
    if (!raw) return null;
    if (raw.length > CREATION_DRAFT_MAX_LENGTH) throw new Error("draft size");
    const value = JSON.parse(raw);
    if (!value || value.accountId !== accountId || !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + CREATION_DRAFT_TTL ||
      ![1, 2, 3].includes(value.step) || !Number.isSafeInteger(value.quantity) ||
      !["productName", "productNameAr", "category", "startDate", "endDate"].every((key) => typeof value[key] === "string") ||
      value.productName.length > 200 || value.productNameAr.length > 200 || value.category.length > 40 || value.startDate.length > 10 || value.endDate.length > 10 ||
      !(value.savedWarrantyId === null || isValidUUID(value.savedWarrantyId)) ||
      typeof value.pendingCreation !== "boolean" || typeof value.pendingAttachments !== "boolean") throw new Error("invalid draft");
    return value as CreationDraft;
  } catch {
    clearCreationDraftStorage(storage);
    return null;
  }
}
