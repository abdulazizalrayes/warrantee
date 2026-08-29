import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.production.local", override: false, quiet: true });
dotenv.config({ path: ".env.local", override: false, quiet: true });

const DEFAULT_TWENTY_API_BASE_URL = "https://api.twenty.com";
const DEFAULT_SINCE = "2026-07-14T00:00:00.000Z";
const strict = process.argv.includes("--strict");

function requireEnv(keys) {
  const missing = keys.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(", ")}`);
}

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function isInternalOrSyntheticEmail(value) {
  const email = normalizeEmail(value);
  if (!email || !email.includes("@")) return true;
  const [local, domain] = email.split("@");
  return domain === "warrantee.io"
    || domain === "example.com"
    || local.includes("abdulaziz")
    || /^(?:qa|test|e2e|demo|codex|synthetic|monitoring)(?:[+._-]|$)/i.test(local);
}

function addCandidate(candidates, emailValue, source) {
  const email = normalizeEmail(emailValue);
  if (isInternalOrSyntheticEmail(email)) return;
  const existing = candidates.get(email) || new Set();
  existing.add(source);
  candidates.set(email, existing);
}

async function readRows(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`Supabase ${label} query failed`);
  return data || [];
}

async function twentyRequest(path) {
  const baseUrl = (process.env.TWENTY_API_BASE_URL || DEFAULT_TWENTY_API_BASE_URL).replace(/\/$/, "");
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${process.env.TWENTY_API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) return response;
      if (![429, 500, 502, 503, 504].includes(response.status) || attempt === attempts) {
        throw new Error(`Twenty lookup failed with status ${response.status}`);
      }
    } catch (error) {
      if (attempt === attempts) throw error;
    } finally {
      clearTimeout(timer);
    }
    await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
  }

  throw new Error("Twenty lookup failed after retries");
}

function extractPeople(body) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.people)) return body.people;
  if (body.data && Array.isArray(body.data.people)) return body.data.people;
  return [];
}

async function existsInTwenty(email) {
  const params = new URLSearchParams({
    filter: `emails.primaryEmail[eq]:"${email}"`,
    limit: "1",
  });
  const response = await twentyRequest(`/rest/people?${params.toString()}`);
  return extractPeople(await response.json().catch(() => null)).length > 0;
}

function emptySourceSummary() {
  return { candidates: 0, matched: 0, missing: 0, errors: 0 };
}

async function main() {
  requireEnv(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "TWENTY_API_KEY"]);
  const since = process.env.CRM_RECONCILIATION_SINCE || DEFAULT_SINCE;
  if (Number.isNaN(Date.parse(since))) throw new Error("CRM_RECONCILIATION_SINCE must be an ISO date");

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [profiles, tickets, invitations] = await Promise.all([
    readRows(
      supabase.from("profiles").select("email, role, created_at").gte("created_at", since).limit(1000),
      "profiles",
    ),
    readRows(
      supabase.from("support_tickets")
        .select("requester_email, source, created_at")
        .in("source", ["contact_form", "seller_application"])
        .gte("created_at", since)
        .limit(1000),
      "support tickets",
    ),
    readRows(
      supabase.from("seller_invitations")
        .select("seller_email, contact_email, created_at")
        .gte("created_at", since)
        .limit(1000),
      "seller invitations",
    ),
  ]);

  const candidates = new Map();
  for (const profile of profiles) {
    if (["admin", "super_admin", "support"].includes(String(profile.role || "").toLowerCase())) continue;
    addCandidate(candidates, profile.email, "signup");
  }
  for (const ticket of tickets) {
    addCandidate(
      candidates,
      ticket.requester_email,
      ticket.source === "seller_application" ? "seller_application" : "contact_form",
    );
  }
  for (const invitation of invitations) {
    addCandidate(candidates, invitation.seller_email || invitation.contact_email, "seller_application");
  }

  const sources = {
    signup: emptySourceSummary(),
    contact_form: emptySourceSummary(),
    seller_application: emptySourceSummary(),
  };
  for (const sourceSet of candidates.values()) {
    for (const source of sourceSet) sources[source].candidates += 1;
  }

  let matched = 0;
  let missing = 0;
  let errors = 0;
  for (const [email, sourceSet] of candidates) {
    try {
      const found = await existsInTwenty(email);
      if (found) matched += 1;
      else missing += 1;
      for (const source of sourceSet) sources[source][found ? "matched" : "missing"] += 1;
    } catch {
      errors += 1;
      for (const source of sourceSet) sources[source].errors += 1;
    }
  }

  const result = {
    ok: missing === 0 && errors === 0,
    provider: "twenty",
    mode: "read_only_privacy_safe",
    since,
    uniqueCandidates: candidates.size,
    matched,
    missing,
    errors,
    sources,
  };
  console.log(JSON.stringify(result, null, 2));

  if (strict && !result.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    provider: "twenty",
    mode: "read_only_privacy_safe",
    error: error instanceof Error ? error.message : "CRM reconciliation failed",
  }, null, 2));
  process.exitCode = 1;
});
