import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function runDailyOperationalMaintenance() {
  const supabase = createSupabaseAdminClient();
  const completedJobCutoff = new Date(Date.now() - 30 * 86400000).toISOString();
  const now = new Date().toISOString();

  const [idempotencyCleanup, jobCleanup, recovery, rollups, reconciliation] = await Promise.all([
    supabase.from("api_idempotency_records").delete().lt("expires_at", now).select("id"),
    supabase
      .from("async_jobs")
      .delete()
      .in("status", ["completed", "cancelled"])
      .lt("updated_at", completedJobCutoff)
      .select("id"),
    supabase.rpc("recover_stale_async_jobs"),
    supabase.rpc("refresh_analytics_daily_rollups", {
      p_day: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    }),
    supabase.rpc("reconcile_internal_payment_ledger"),
  ]);

  const errors = [idempotencyCleanup, jobCleanup, recovery, rollups, reconciliation]
    .map((result) => result.error?.message)
    .filter(Boolean);

  return {
    status: errors.length ? "degraded" : "ok",
    idempotencyRecordsDeleted: idempotencyCleanup.data?.length || 0,
    completedJobsDeleted: jobCleanup.data?.length || 0,
    staleJobsRecovered: recovery.data || 0,
    rollupsRefreshed: rollups.data || 0,
    reconciliationFindingsTouched: reconciliation.data || 0,
    errors,
  };
}
