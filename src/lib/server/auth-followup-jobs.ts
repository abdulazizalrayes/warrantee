import { randomUUID } from "node:crypto";
import type { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { boundedAuthRequest } from "@/lib/auth-request";
import { upsertCrmContact } from "@/lib/crm";
import { welcomeEmail } from "@/lib/email";
import { getEmailFromAddress } from "@/lib/email-config";
import { getContentLocale, normalizeLocale } from "@/lib/i18n";

type Admin = ReturnType<typeof createSupabaseAdminClient>;
const JOB_TYPES = ["auth_signup_crm", "auth_signup_welcome"];

export async function enqueueAuthFollowupJobs(admin: Admin, userId: string, locale: string) {
  return boundedAuthRequest(async (signal) => {
    // Include terminal failures: a later login must not resurrect an uncertain send.
    const { data, error } = await admin.from("async_jobs")
      .select("job_type").eq("owner_user_id", userId).in("job_type", JOB_TYPES).abortSignal(signal);
    if (error) throw new Error("auth_followup_lookup_failed");
    const missing = JOB_TYPES.filter((type) => !data?.some((job) => job.job_type === type));
    if (!missing.length) return;
    const inserted = await admin.from("async_jobs").insert(missing.map((jobType) => ({
      job_type: jobType, owner_user_id: userId, idempotency_key: `${jobType}:${userId}`,
      payload: { locale: normalizeLocale(locale) }, max_attempts: 5,
    }))).abortSignal(signal);
    if (inserted.error && inserted.error.code !== "23505") throw new Error("auth_followup_enqueue_failed");
  }, 2500);
}

export async function processAuthFollowupJobs(admin: Admin, ownerUserId?: string) {
  const worker = `auth-followup:${randomUUID()}`;
  const now = new Date().toISOString();
  const { data: candidates, error } = await boundedAuthRequest((signal) => {
    let query = admin.from("async_jobs").select("*").in("job_type", JOB_TYPES)
      .in("status", ["queued", "retry"]).lte("available_at", now).order("created_at").limit(2);
    if (ownerUserId) query = query.eq("owner_user_id", ownerUserId);
    return query.abortSignal(signal);
  });
  if (error) throw new Error("auth_followup_claim_failed");
  const summary = { completed: 0, retried: 0, failed: 0 };
  for (const candidate of candidates || []) {
    if (candidate.attempts >= candidate.max_attempts) continue;
    // Compare-and-set claims only our job types, without consuming other workers' jobs.
    const { data: job, error: claimError } = await boundedAuthRequest((signal) => admin.from("async_jobs")
      .update({ status: "processing", attempts: candidate.attempts + 1, locked_by: worker, locked_at: now, updated_at: now })
      .eq("id", candidate.id).eq("status", candidate.status).eq("attempts", candidate.attempts)
      .select("*").abortSignal(signal).maybeSingle());
    if (claimError) throw new Error("auth_followup_claim_failed");
    if (!job) continue;
    let permanent = false;
    let dispatchStarted = false;
    let errorCode = "auth_followup_provider_failed";
    try {
      if (!job.owner_user_id) {
        permanent = true;
        throw new Error("owner_missing");
      }
      const previous = job.result as { dispatch_started?: boolean } | null;
      if (job.job_type === "auth_signup_welcome" && previous?.dispatch_started) {
        permanent = true;
        errorCode = "welcome_delivery_uncertain";
        throw new Error(errorCode);
      }
      const { data: profile, error: profileError } = await boundedAuthRequest((signal) => admin.from("profiles")
        .select("email, full_name").eq("id", job.owner_user_id!).abortSignal(signal).single());
      if (profileError || !profile?.email) throw new Error("profile_unavailable");
      if (job.job_type === "auth_signup_crm") {
        const result = await upsertCrmContact({
          email: profile.email, firstname: profile.full_name || "User", lifecycleStage: "subscriber", source: "signup",
        });
        if (!result.enabled || "error" in result) throw new Error("crm_unavailable");
      } else {
        if (!process.env.RESEND_API_KEY) throw new Error("email_unavailable");
        // Persist before sending. An uncertain dispatch is quarantined, never blindly resent.
        const marked = await boundedAuthRequest((signal) => admin.from("async_jobs")
          .update({ result: { dispatch_started: true }, updated_at: new Date().toISOString() })
          .eq("id", job.id).eq("locked_by", worker).eq("status", "processing")
          .select("id").abortSignal(signal).single());
        if (marked.error || !marked.data) throw new Error("dispatch_record_failed");
        dispatchStarted = true;
        const payload = job.payload as { locale?: string };
        const safeName = (profile.full_name || "User").replace(/[&<>"']/g, (char: string) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
        const message = welcomeEmail(safeName, getContentLocale(normalizeLocale(payload.locale)));
        const response = await boundedAuthRequest((signal) => fetch("https://api.resend.com/emails", {
          method: "POST", signal,
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": job.idempotency_key! },
          body: JSON.stringify({ from: getEmailFromAddress(), to: profile.email, ...message }),
        }));
        if (!response.ok) throw new Error("email_provider_failed");
      }
      const completed = await boundedAuthRequest((signal) => admin.from("async_jobs").update({
        status: "completed", result: { provider_accepted: true }, completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), locked_by: null, locked_at: null, last_error_code: null,
      }).eq("id", job.id).eq("locked_by", worker).eq("status", "processing")
        .select("id").abortSignal(signal).maybeSingle());
      if (completed.error || !completed.data) throw new Error("completion_record_failed");
      summary.completed += 1;
    } catch {
      const failed = permanent || dispatchStarted || job.attempts >= job.max_attempts;
      if (dispatchStarted) errorCode = "welcome_delivery_uncertain";
      const updated = await boundedAuthRequest((signal) => admin.from("async_jobs").update({
        status: failed ? "failed" : "retry", last_error_code: errorCode,
        last_error_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        available_at: new Date(Date.now() + 5 * 60_000 * job.attempts).toISOString(), locked_by: null, locked_at: null,
      }).eq("id", job.id).eq("locked_by", worker).eq("status", "processing").abortSignal(signal));
      if (updated.error) throw new Error("auth_followup_result_failed");
      summary[failed ? "failed" : "retried"] += 1;
    }
  }
  return summary;
}
