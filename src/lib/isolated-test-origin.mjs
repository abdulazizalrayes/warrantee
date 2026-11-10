// Only the disposable CI stack may add a local data origin to the strict CSP.
/** @param {Record<string, string | undefined>} env */
export function isolatedSupabaseOrigin(env = process.env) {
  if (env.WARRANTEE_ISOLATED_E2E !== "1") return null;
  if (env.VERCEL || env.VERCEL_ENV) throw new Error("Isolated test configuration is forbidden on Vercel");
  const database = new URL(env.NEXT_PUBLIC_SUPABASE_URL || "");
  const app = new URL(env.NEXT_PUBLIC_APP_URL || "");
  for (const url of [database, app]) {
    if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new Error("Isolated tests require explicit loopback-only origins");
    }
  }
  if (database.port !== "54321" || !["3100", "3111"].includes(app.port)) {
    throw new Error("Unexpected isolated test ports");
  }
  return database.origin;
}

/** @param {string} requestUrl @param {Record<string, string | undefined>} env */
export function authRedirectOrigin(requestUrl, env = process.env) {
  // NextURL normalizes loopback hosts; test cookies must stay on their verified origin.
  return isolatedSupabaseOrigin(env) ? new URL(env.NEXT_PUBLIC_APP_URL).origin : new URL(requestUrl).origin;
}
