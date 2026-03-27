// Warrantee — Ingestion Engine Public API

export { matchSender } from './sender-matcher';
export { processDocument } from './ocr-pipeline';
export { detectFraud, computeSimHash, checkSimHashDuplicate } from './fraud-detection';
export { logAudit } from './audit-logger';
export type { AuditAction } from './audit-logger';
export * from './types';
