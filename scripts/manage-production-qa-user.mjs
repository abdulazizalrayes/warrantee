import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.production.local", override: false });
dotenv.config({ path: ".env.local", override: false });

const mode = process.argv[2];
const allowedModes = new Set(["ensure", "cleanup", "verify-clean"]);

if (!allowedModes.has(mode)) {
  throw new Error("Usage: node scripts/manage-production-qa-user.mjs <ensure|cleanup|verify-clean>");
}

const requiredEnv = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "E2E_USER_EMAIL",
];
if (mode === "ensure") requiredEnv.push("E2E_USER_PASSWORD");
const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`Missing required QA lifecycle env vars: ${missingEnv.join(", ")}`);
}

const qaEmail = process.env.E2E_USER_EMAIL.trim().toLowerCase();
const qaPassword = process.env.E2E_USER_PASSWORD || "";
const [qaLocalPart = "", qaDomain = ""] = qaEmail.split("@");
const qaMarker = /(^|[+._-])(qa|e2e|test|smoke)([+._-]|$)/i;

if (
  qaDomain !== "warrantee.io"
  || !(qaLocalPart.startsWith("qa") || qaMarker.test(qaLocalPart))
) {
  throw new Error("Safety stop: E2E_USER_EMAIL must be a clearly marked @warrantee.io QA identity");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function chunks(values, size = 100) {
  const result = [];
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size));
  }
  return result;
}

async function listAuthUsers() {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  return data.users;
}

async function findQaUser() {
  const users = await listAuthUsers();
  return users.find((user) => user.email?.toLowerCase() === qaEmail) || null;
}

async function selectIds(table, configure) {
  let query = supabase.from(table).select("id");
  query = configure(query);
  const { data, error } = await query;
  if (error) throw new Error(`${table} QA lookup failed: ${error.message}`);
  return unique((data || []).map((row) => row.id));
}

async function deleteByIds(table, ids) {
  let deleted = 0;
  for (const batch of chunks(ids)) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: "exact" })
      .in("id", batch);
    if (error) throw new Error(`${table} QA cleanup failed: ${error.message}`);
    deleted += count || 0;
  }
  return deleted;
}

async function deleteWhere(table, configure) {
  let query = supabase.from(table).delete({ count: "exact" });
  query = configure(query);
  const { error, count } = await query;
  if (error) throw new Error(`${table} QA cleanup failed: ${error.message}`);
  return count || 0;
}

async function collectQaGraph(userId) {
  const warranties = await selectIds("warranties", (query) =>
    query.or(
      [
        `user_id.eq.${userId}`,
        `created_by.eq.${userId}`,
        `issuer_user_id.eq.${userId}`,
        `recipient_user_id.eq.${userId}`,
        `approved_by.eq.${userId}`,
        `archived_by.eq.${userId}`,
      ].join(","),
    ),
  );

  const directlyOwnedClaims = await selectIds("warranty_claims", (query) =>
    query.or(`filed_by.eq.${userId},assigned_to.eq.${userId},archived_by.eq.${userId}`),
  );
  const warrantyClaims = warranties.length > 0
    ? await selectIds("warranty_claims", (query) => query.in("warranty_id", warranties))
    : [];
  const claims = unique([...directlyOwnedClaims, ...warrantyClaims]);

  const directlyOwnedExtensions = await selectIds("warranty_extensions", (query) =>
    query.or(`offered_by.eq.${userId},purchased_by.eq.${userId}`),
  );
  const warrantyExtensions = warranties.length > 0
    ? await selectIds("warranty_extensions", (query) =>
      query.or(`warranty_id.in.(${warranties.join(",")}),new_warranty_id.in.(${warranties.join(",")})`),
    )
    : [];

  const companies = await selectIds("companies", (query) => query.eq("created_by", userId));
  const tickets = await selectIds("support_tickets", (query) =>
    query.or(`user_id.eq.${userId},assigned_to.eq.${userId}`),
  );

  return {
    warranties,
    claims,
    extensions: unique([...directlyOwnedExtensions, ...warrantyExtensions]),
    companies,
    tickets,
  };
}

async function ensureQaUser() {
  let user = await findQaUser();
  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: qaEmail,
      password: qaPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "Warrantee QA User",
        operational_qa: true,
      },
    });
    if (error || !data.user) throw error || new Error("QA auth user creation returned no user");
    user = data.user;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password: qaPassword,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        full_name: "Warrantee QA User",
        operational_qa: true,
      },
    });
    if (error) throw error;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      email: qaEmail,
      full_name: "Warrantee QA User",
      role: "super_admin",
      account_type: "consumer",
      preferred_language: "en",
      preferred_locale: "en",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw profileError;

  console.log(JSON.stringify({ status: "ready", qaIdentity: "ephemeral" }));
}

async function cleanupQaUser() {
  const user = await findQaUser();
  if (!user) {
    console.log(JSON.stringify({ status: "clean", deletedAuthUsers: 0 }));
    return;
  }

  const graph = await collectQaGraph(user.id);
  const deleted = {};

  if (graph.tickets.length > 0) {
    deleted.support_ticket_messages = await deleteWhere(
      "support_ticket_messages",
      (query) => query.in("ticket_id", graph.tickets),
    );
  }
  deleted.support_ticket_messages_by_sender = await deleteWhere(
    "support_ticket_messages",
    (query) => query.eq("sender_id", user.id),
  );
  deleted.support_tickets = await deleteByIds("support_tickets", graph.tickets);

  if (graph.claims.length > 0) {
    deleted.claim_attachments = await deleteWhere(
      "claim_attachments",
      (query) => query.in("claim_id", graph.claims),
    );
    deleted.claim_events = await deleteWhere(
      "claim_events",
      (query) => query.in("claim_id", graph.claims),
    );
  }
  deleted.claim_attachments_by_uploader = await deleteWhere(
    "claim_attachments",
    (query) => query.eq("uploaded_by", user.id),
  );
  deleted.claim_events_by_actor = await deleteWhere(
    "claim_events",
    (query) => query.eq("created_by", user.id),
  );

  deleted.notifications_by_user = await deleteWhere(
    "notifications",
    (query) => query.eq("user_id", user.id),
  );
  if (graph.warranties.length > 0) {
    deleted.notifications_by_warranty = await deleteWhere(
      "notifications",
      (query) => query.in("warranty_id", graph.warranties),
    );
  }
  if (graph.claims.length > 0) {
    deleted.notifications_by_claim = await deleteWhere(
      "notifications",
      (query) => query.in("claim_id", graph.claims),
    );
  }

  if (graph.extensions.length > 0) {
    deleted.revenue_events_by_extension = await deleteWhere(
      "revenue_events",
      (query) => query.in("warranty_extension_id", graph.extensions),
    );
  }
  deleted.revenue_events_by_user = await deleteWhere(
    "revenue_events",
    (query) => query.eq("user_id", user.id),
  );
  deleted.warranty_extensions = await deleteByIds("warranty_extensions", graph.extensions);

  if (graph.warranties.length > 0) {
    const { data: documents, error: documentsError } = await supabase
      .from("warranty_documents")
      .select("id,storage_path")
      .in("warranty_id", graph.warranties);
    if (documentsError) throw documentsError;
    const storagePaths = unique((documents || []).map((document) => document.storage_path));
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("warranty-documents")
        .remove(storagePaths);
      if (storageError) throw storageError;
    }

    deleted.warranty_documents = await deleteWhere(
      "warranty_documents",
      (query) => query.in("warranty_id", graph.warranties),
    );
    deleted.warranty_coverage_items = await deleteWhere(
      "warranty_coverage_items",
      (query) => query.in("warranty_id", graph.warranties),
    );
    deleted.warranty_chain_assignments = await deleteWhere(
      "warranty_chain_assignments",
      (query) => query.in("original_warranty_id", graph.warranties),
    );
    deleted.email_ingestion = await deleteWhere(
      "email_ingestion",
      (query) => query.in("warranty_id", graph.warranties),
    );

    const { error: attachmentError } = await supabase
      .from("ingestion_attachments")
      .update({ warranty_id: null })
      .in("warranty_id", graph.warranties);
    if (attachmentError) throw attachmentError;
  }

  deleted.warranty_documents_by_uploader = await deleteWhere(
    "warranty_documents",
    (query) => query.eq("uploaded_by", user.id),
  );
  deleted.warranty_claims = await deleteByIds("warranty_claims", graph.claims);

  deleted.activity_log_by_actor = await deleteWhere(
    "activity_log",
    (query) => query.eq("actor_id", user.id),
  );
  for (const entityIds of [graph.warranties, graph.claims, graph.extensions]) {
    if (entityIds.length > 0) {
      deleted.activity_log_by_entity = (deleted.activity_log_by_entity || 0)
        + await deleteWhere("activity_log", (query) => query.in("entity_id", entityIds));
    }
  }

  deleted.warranties = await deleteByIds("warranties", graph.warranties);

  deleted.company_members = await deleteWhere(
    "company_members",
    (query) => query.eq("user_id", user.id),
  );
  for (const companyId of graph.companies) {
    const { count: otherMembers, error: membersError } = await supabase
      .from("company_members")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .neq("user_id", user.id);
    if (membersError) throw membersError;
    if ((otherMembers || 0) === 0) {
      deleted.company_contacts = (deleted.company_contacts || 0)
        + await deleteWhere("company_contacts", (query) => query.eq("company_id", companyId));
      deleted.company_branches = (deleted.company_branches || 0)
        + await deleteWhere("company_branches", (query) => query.eq("company_id", companyId));
      deleted.company_members_by_company = (deleted.company_members_by_company || 0)
        + await deleteWhere("company_members", (query) => query.eq("company_id", companyId));
      deleted.companies = (deleted.companies || 0)
        + await deleteWhere("companies", (query) => query.eq("id", companyId));
    }
  }

  for (const table of ["admin_sessions", "admin_audit_log"]) {
    deleted[table] = await deleteWhere(table, (query) => query.eq("admin_id", user.id));
  }
  deleted.admin_invitations = await deleteWhere(
    "admin_invitations",
    (query) => query.eq("invited_by", user.id),
  );
  deleted.fraud_signals = await deleteWhere(
    "fraud_signals",
    (query) => query.or(`assigned_to.eq.${user.id},resolved_by.eq.${user.id}`),
  );
  deleted.seller_invitations = await deleteWhere(
    "seller_invitations",
    (query) => query.or(
      `invited_by.eq.${user.id},inviter_id.eq.${user.id},user_id.eq.${user.id}`,
    ),
  );
  deleted.email_ingestion_by_user = await deleteWhere(
    "email_ingestion",
    (query) => query.eq("user_id", user.id),
  );
  deleted.provisional_warranties = await deleteWhere(
    "provisional_warranties",
    (query) => query.eq("user_id", user.id),
  );
  const { error: ingestionError } = await supabase
    .from("ingestion_jobs")
    .update({ matched_user_id: null })
    .eq("matched_user_id", user.id);
  if (ingestionError) throw ingestionError;

  for (const table of [
    "push_subscriptions",
    "api_usage_events",
    "api_integration_tokens",
    "subscriptions",
  ]) {
    deleted[table] = await deleteWhere(table, (query) => query.eq("user_id", user.id));
  }

  const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user.id);
  if (deleteUserError) throw deleteUserError;

  console.log(JSON.stringify({
    status: "clean",
    deletedAuthUsers: 1,
    deletedRecords: Object.values(deleted).reduce((sum, value) => sum + value, 0),
  }));
}

async function verifyClean() {
  const user = await findQaUser();
  const { count: profileCount, error: profileError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("email", qaEmail);
  if (profileError) throw profileError;

  if (user || (profileCount || 0) > 0) {
    throw new Error("Persistent QA identity remains after cleanup");
  }

  console.log(JSON.stringify({ status: "clean", persistentQaUsers: 0 }));
}

if (mode === "ensure") await ensureQaUser();
if (mode === "cleanup") await cleanupQaUser();
if (mode === "verify-clean") await verifyClean();
