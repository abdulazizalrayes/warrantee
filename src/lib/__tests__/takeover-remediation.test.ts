import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLAIM_TRANSITIONS,
  isAllowedClaimTransition,
} from "../claim-transitions";
import {
  maskPublicSerialNumber,
  PUBLIC_WARRANTY_STATUSES,
} from "../public-warranty";

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("takeover audit remediation", () => {
  it("fails closed for invalid API scopes", () => {
    const api = readProjectFile("src/lib/api-v1.ts");
    const tokenRoute = readProjectFile("src/app/api/integration-tokens/route.ts");

    expect(api).toContain("if (!Array.isArray(value)) return []");
    expect(api).toContain("if (scopes.length === 0)");
    expect(tokenRoute).toContain("Select at least one valid API scope");
  });

  it("keeps public warranty proof issued-only and masks serial numbers", () => {
    const verifyRoute = readProjectFile(
      "src/app/api/v1/warranties/verify/route.ts"
    );
    const certificateRoute = readProjectFile(
      "src/app/api/v1/warranties/verify/[id]/certificate/route.ts"
    );

    expect(PUBLIC_WARRANTY_STATUSES).not.toContain("draft");
    expect(PUBLIC_WARRANTY_STATUSES).not.toContain("pending_approval");
    expect(maskPublicSerialNumber("ABC123456789")).toBe("********6789");
    expect(maskPublicSerialNumber("1234")).toBe("****");
    expect(verifyRoute).toContain('serial_number: maskPublicSerialNumber');
    expect(verifyRoute).not.toContain("certificate_url");
    expect(certificateRoute).toContain("maskPublicSerialNumber(data.serial_number)");
  });

  it("uses an explicit claim state machine", () => {
    expect(CLAIM_TRANSITIONS.draft).toEqual(["submitted"]);
    expect(CLAIM_TRANSITIONS.under_review).toEqual([
      "approved",
      "rejected",
      "awaiting_info",
    ]);
    expect(isAllowedClaimTransition("draft", "submitted")).toBe(true);
    expect(isAllowedClaimTransition("draft", "approved")).toBe(false);

    const migration = readProjectFile(
      "supabase/migrations/20260724214245_atomic_claim_transitions.sql"
    );
    const route = readProjectFile(
      "src/app/api/claims/[id]/transition/route.ts"
    );
    expect(migration).toContain("for update");
    expect(migration).toContain("claim_transition_forbidden");
    expect(route).toContain('rpc("transition_warranty_claim"');
  });

  it("keeps tenant and private-file access deny-by-default", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260724214205_harden_tenant_and_storage_access.sql"
    );

    expect(migration).toContain("alter table public.warranties force row level security");
    expect(migration).toContain("private.can_view_warranty(id)");
    expect(migration).toContain("private.can_mutate_warranty(id)");
    expect(migration).toContain("alter table public.companies drop column if exists api_key");
    expect(migration).toContain("split_part(name, '/', 1) = (select auth.uid())::text");
    expect(migration).not.toContain("bucket_id = 'warranty-documents'\\n    and auth.role()");
  });

  it("creates business tenants atomically from validated signup metadata", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260724214305_self_service_business_onboarding.sql"
    );

    expect(migration).toContain("requested_account_type");
    expect(migration).toContain("insert into public.companies");
    expect(migration).toContain("insert into public.company_members");
    expect(migration).toContain("'company_admin'::public.user_role");
    expect(migration).toContain("on conflict (company_id, user_id) do update");
  });

  it("claims Stripe events and fulfills extension payments atomically", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260724214255_atomic_billing_and_data_constraints.sql"
    );
    const webhook = readProjectFile("src/app/api/stripe/webhook/route.ts");
    const paymentCreate = readProjectFile("src/app/api/payments/create/route.ts");

    expect(migration).toContain("claim_stripe_webhook_event");
    expect(migration).toContain("fulfill_warranty_extension_payment");
    expect(migration).toContain("record_warranty_extension_payment_exception");
    expect(migration).toContain("for update");
    expect(webhook).toContain('case "charge.refunded"');
    expect(webhook).toContain('case "charge.dispute.created"');
    expect(webhook).toContain("Stripe extension payment was missing its user");
    expect(paymentCreate).toContain(
      "'payment_intent_data[metadata][extension_id]'"
    );
    expect(paymentCreate).not.toContain("MOYASAR_SECRET_KEY");

    const purchaseActorMigration = readProjectFile(
      "supabase/migrations/20260724214735_require_extension_purchase_actor.sql"
    );
    expect(purchaseActorMigration).toContain(
      "is_purchased = false or purchased_by is not null"
    );
  });

  it("uses the current Resend receiving and webhook verification contracts", () => {
    const route = readProjectFile("src/app/api/ingest/email/route.ts");

    expect(route).toContain("resend.webhooks.verify");
    expect(route).toContain("verifiedEvent.type !== 'email.received'");
    expect(route).toContain("resend.emails.receiving.get");
    expect(route).toContain("resend.emails.receiving.attachments.list");
    expect(route).not.toContain("x-resend-signature");
  });

  it("keeps email ingestion aligned with the live schema", () => {
    const route = readProjectFile("src/app/api/ingest/email/route.ts");
    const fraud = readProjectFile("src/lib/ingestion/fraud-detection.ts");
    const senderMatcher = readProjectFile("src/lib/ingestion/sender-matcher.ts");

    expect(route).toContain("if (!startDate || !endDate)");
    expect(route).toContain("if (autoConfirmed)");
    expect(fraud).toContain("entity_type: 'ingestion_attachment'");
    expect(fraud).toContain("evidence: s.details as Json");
    expect(senderMatcher).toContain(".from('company_members')");
    expect(senderMatcher).toContain(".from('companies')");
    expect(senderMatcher).not.toContain("linked_emails");
    expect(senderMatcher).not.toContain(".eq('company_domain'");
  });

  it("pins OCR behavior and records pipeline versions", () => {
    const mistral = readProjectFile("src/lib/ocr/mistral.ts");
    const telemetry = readProjectFile("src/lib/ocr/telemetry.ts");
    const ingestionPipeline = readProjectFile(
      "src/lib/ingestion/ocr-pipeline.ts"
    );

    expect(mistral).toContain('DEFAULT_MISTRAL_OCR_MODEL = "mistral-ocr-4-0"');
    expect(telemetry).toContain("pipelineVersion?: string");
    expect(telemetry).toContain("parserVersion?: string");
    expect(ingestionPipeline).toContain("OCR_PIPELINE_VERSION");
    expect(ingestionPipeline).toContain("OCR_FIELD_PARSER_VERSION");
  });
});
