export const PRIMARY_BUSINESS_EMAIL = "hello@warrantee.io";

export function getEmailFromAddress() {
  const configured = String(process.env.EMAIL_FROM || "").trim();
  return configured || `Warrantee <${PRIMARY_BUSINESS_EMAIL}>`;
}

export function getBusinessInboxBcc() {
  return PRIMARY_BUSINESS_EMAIL;
}
