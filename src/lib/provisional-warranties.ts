import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { logAudit } from "@/lib/ingestion";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type BuyerConfirmationAction = "confirm" | "reject";

type BuyerConfirmationTokenPayload = {
  provisionalId: string;
  userId: string;
  email: string;
  action: BuyerConfirmationAction;
  expiresAt: number;
};

function getBuyerConfirmationSecret() {
  return (
    process.env.WARRANTEE_EMAIL_ACTION_SECRET ||
    process.env.RESEND_WEBHOOK_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "warrantee-email-action-secret"
  );
}

function encodeBase64Url(value: string) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function signBuyerConfirmationPayload(payload: BuyerConfirmationTokenPayload) {
  return crypto
    .createHmac("sha256", getBuyerConfirmationSecret())
    .update(JSON.stringify(payload))
    .digest("hex");
}

export function createBuyerConfirmationToken(payload: BuyerConfirmationTokenPayload) {
  const signature = signBuyerConfirmationPayload(payload);
  return encodeBase64Url(JSON.stringify({ payload, signature }));
}

export function verifyBuyerConfirmationToken(token: string) {
  try {
    const decoded = JSON.parse(decodeBase64Url(token));
    const payload = decoded?.payload as BuyerConfirmationTokenPayload | undefined;
    const signature = String(decoded?.signature || "");

    if (!payload || !signature) return null;
    if (!payload.provisionalId || !payload.userId || !payload.email || !payload.action || !payload.expiresAt) {
      return null;
    }

    const expected = signBuyerConfirmationPayload(payload);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
    if (Date.now() > payload.expiresAt) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function confirmProvisionalWarranty(
  provisionalId: string,
  opts: {
    corrections?: Record<string, unknown>;
    actor?: string;
    auditAction?: "user_confirmed" | "buyer_confirmed";
  } = {}
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: provisional, error: fetchError } = await supabaseAdmin
    .from("provisional_warranties")
    .select("*")
    .eq("id", provisionalId)
    .single();

  if (fetchError || !provisional) {
    return { ok: false, status: 404, error: "Provisional warranty not found" as const };
  }

  if (provisional.status === "confirmed") {
    return { ok: true, status: 200, warrantyId: null, provisional, alreadyProcessed: true };
  }

  if (provisional.status !== "pending") {
    return { ok: false, status: 409, error: `Provisional warranty is already ${provisional.status}` as const };
  }

  const corrections = opts.corrections || {};
  const warrantyData = {
    recipient_user_id: provisional.user_id,
    product_name: corrections.product_name || provisional.product_name || "Unknown Product",
    sku: corrections.model_number || provisional.model_number || null,
    serial_number: corrections.serial_number || provisional.serial_number || null,
    start_date: corrections.purchase_date || provisional.purchase_date || null,
    end_date: corrections.expiry_date || provisional.expiry_date || null,
    seller_name: corrections.seller_name || provisional.seller_name || null,
    is_self_registered: true,
    source: "email_ingestion",
    ingestion_job_id: provisional.ingestion_job_id,
  };

  const { data: warranty, error: createError } = await supabaseAdmin
    .from("warranties")
    .insert(warrantyData)
    .select("id")
    .single();

  if (createError || !warranty) {
    return { ok: false, status: 500, error: createError?.message || "Failed to confirm warranty" };
  }

  await supabaseAdmin
    .from("provisional_warranties")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", provisionalId);

  if (provisional.attachment_id) {
    await supabaseAdmin
      .from("ingestion_attachments")
      .update({ warranty_id: warranty.id })
      .eq("id", provisional.attachment_id);
  }

  if (provisional.ingestion_job_id) {
    await supabaseAdmin
      .from("ingestion_jobs")
      .update({ status: "confirmed" })
      .eq("id", provisional.ingestion_job_id);

    await logAudit(
      provisional.ingestion_job_id,
      opts.auditAction || "user_confirmed",
      opts.actor || `user:${provisional.user_id}`,
      {
        provisional_id: provisionalId,
        warranty_id: warranty.id,
        corrections_applied: Object.keys(corrections),
      },
      provisional.attachment_id
    );
  }

  return { ok: true, status: 200, warrantyId: warranty.id, provisional };
}

export async function rejectProvisionalWarranty(
  provisionalId: string,
  opts: {
    reason?: "reject" | "not_warranty";
    actor?: string;
    auditAction?: "user_rejected" | "buyer_rejected";
  } = {}
) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: provisional, error: fetchError } = await supabaseAdmin
    .from("provisional_warranties")
    .select("*")
    .eq("id", provisionalId)
    .single();

  if (fetchError || !provisional) {
    return { ok: false, status: 404, error: "Provisional warranty not found" as const };
  }

  if (provisional.status === "rejected" || provisional.status === "not_warranty") {
    return { ok: true, status: 200, provisional, alreadyProcessed: true };
  }

  if (provisional.status !== "pending") {
    return { ok: false, status: 409, error: `Provisional warranty is already ${provisional.status}` as const };
  }

  const nextStatus = opts.reason === "not_warranty" ? "not_warranty" : "rejected";
  await supabaseAdmin
    .from("provisional_warranties")
    .update({ status: nextStatus })
    .eq("id", provisionalId);

  if (provisional.ingestion_job_id) {
    await supabaseAdmin
      .from("ingestion_jobs")
      .update({ status: "pending_review" })
      .eq("id", provisional.ingestion_job_id);

    await logAudit(
      provisional.ingestion_job_id,
      opts.auditAction || "user_rejected",
      opts.actor || `user:${provisional.user_id}`,
      {
        provisional_id: provisionalId,
        reason: opts.reason || "reject",
      },
      provisional.attachment_id
    );
  }

  return { ok: true, status: 200, provisional };
}
