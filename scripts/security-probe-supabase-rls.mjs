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

const exposed = results.filter((result) => Number(result.rows) > 0);
if (exposed.length > 0) {
  console.error(
    `Unauthenticated exposure detected: ${exposed.map((result) => result.target).join(", ")}`
  );
  process.exit(2);
}
