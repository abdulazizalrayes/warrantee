import "dotenv/config";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.production.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

const fetchWithTimeout = async (input, init = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false },
  global: { fetch: fetchWithTimeout },
});

const publicTablesToProbe = [
  "profiles",
  "warranties",
  "warranty_documents",
  "warranty_claims",
  "warranty_extensions",
  "notifications",
  "seller_invitations",
  "provisional_warranties",
];

const privilegedRpcsToProbe = [
  "get_admin_users_list",
  "get_admin_platform_stats",
  "get_admin_subscription_stats",
  "get_admin_user_growth",
];

const results = [];

for (const table of publicTablesToProbe) {
  try {
    const { data, error, status } = await supabase.from(table).select("*").limit(1);
    results.push({
      target: table,
      status,
      rows: Array.isArray(data) ? data.length : null,
      error: error?.message || null,
    });
  } catch (error) {
    results.push({
      target: table,
      status: "exception",
      rows: null,
      error: error.name === "AbortError" ? "timeout" : error.message,
    });
  }
}

const rpcResults = [];
for (const rpc of privilegedRpcsToProbe) {
  try {
    const { data, error, status } = await supabase.rpc(rpc);
    rpcResults.push({
      target: `rpc:${rpc}`,
      status,
      blocked: Boolean(error),
      errorCode: error?.code || null,
      error: error?.message || null,
      returnedData: data !== null && data !== undefined,
    });
  } catch (error) {
    rpcResults.push({
      target: `rpc:${rpc}`,
      status: "exception",
      blocked: true,
      errorCode: null,
      error: error.name === "AbortError" ? "timeout" : error.message,
      returnedData: false,
    });
  }
}

try {
  const { data, error } = await supabase.storage
    .from("warranty-documents")
    .list("", { limit: 1 });

  results.push({
    target: "storage:warranty-documents:list-root",
    status: error ? "error" : "ok",
    rows: Array.isArray(data) ? data.length : null,
    error: error?.message || null,
  });
} catch (error) {
  results.push({
    target: "storage:warranty-documents:list-root",
    status: "exception",
    rows: null,
    error: error.name === "AbortError" ? "timeout" : error.message,
  });
}

console.table(results);
console.table(rpcResults);

const exposed = results.filter((result) => Number(result.rows) > 0);
if (exposed.length > 0) {
  console.error(
    `Unauthenticated exposure detected: ${exposed.map((result) => result.target).join(", ")}`
  );
  process.exit(2);
}

const exposedRpcs = rpcResults.filter((result) => !result.blocked);
const brokenRpcs = rpcResults.filter(
  (result) => result.errorCode === "42P01" || /relation .* does not exist/i.test(result.error || ""),
);
if (exposedRpcs.length > 0 || brokenRpcs.length > 0) {
  console.error(
    `Privileged RPC gate failed: ${[...exposedRpcs, ...brokenRpcs].map((result) => result.target).join(", ")}`,
  );
  process.exit(3);
}

const e2eEmail = process.env.E2E_USER_EMAIL;
const e2ePassword = process.env.E2E_USER_PASSWORD;
if (!e2eEmail || !e2ePassword) {
  if (process.env.CI === "true") {
    console.error("Missing E2E_USER_EMAIL or E2E_USER_PASSWORD for authenticated privilege probes");
    process.exit(4);
  }
  console.warn("Skipping authenticated privilege probes locally; CI requires E2E credentials");
  process.exit(0);
}

const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: e2eEmail,
  password: e2ePassword,
});
if (authError || !authData.user) {
  console.error(`Authenticated privilege probe could not sign in: ${authError?.message || "unknown error"}`);
  process.exit(5);
}

const { data: ownProfile, error: profileError } = await supabase
  .from("profiles")
  .select("role, account_type")
  .eq("id", authData.user.id)
  .single();
if (profileError || !ownProfile) {
  console.error(`Authenticated privilege probe could not read its profile: ${profileError?.message || "unknown error"}`);
  process.exit(6);
}

const privilegeResults = [];
for (const column of ["role", "account_type"]) {
  const { error, status } = await supabase
    .from("profiles")
    .update({ [column]: ownProfile[column] })
    .eq("id", authData.user.id);
  privilegeResults.push({
    target: `profiles.${column}`,
    status,
    blocked: Boolean(error),
    error: error?.message || null,
  });
}
await supabase.auth.signOut();
console.table(privilegeResults);

const privilegeLeaks = privilegeResults.filter((result) => !result.blocked);
if (privilegeLeaks.length > 0) {
  console.error(
    `Authenticated authorization-column update allowed: ${privilegeLeaks.map((result) => result.target).join(", ")}`,
  );
  process.exit(7);
}
