import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("untrusted external content boundaries", () => {
  it("classifies inbound email before creating an ingestion record", () => {
    const route = source("src/app/api/ingest/email/route.ts");
    expect(route.indexOf("const emailAssessment = assessUntrustedContent")).toBeGreaterThan(0);
    expect(route.indexOf("const emailAssessment = assessUntrustedContent")).toBeLessThan(
      route.indexOf(".from('ingestion_jobs')"),
    );
  });

  it.each([
    ["src/app/api/contact/route.ts", "contact_form"],
    ["src/app/api/feedback/route.ts", "customer_feedback"],
    ["src/app/api/seller/applications/route.ts", "seller_application"],
  ])("blocks instruction attacks before external intake writes in %s", (path, surface) => {
    const route = source(path);
    expect(route).toContain("assessUntrustedContent");
    expect(route).toContain("isInstructionAttack");
    expect(route).toContain(`recordUntrustedContentEvent(\"${surface}\"`);
  });

  it("classifies OCR text before hashing or business workflow actions", () => {
    const route = source("src/app/api/ingest/email/route.ts");
    const assessment = route.indexOf("const ocrAssessment = assessUntrustedContent");
    expect(assessment).toBeGreaterThan(route.indexOf("await processDocument"));
    expect(assessment).toBeLessThan(route.indexOf("const simHash", assessment));
    expect(assessment).toBeLessThan(route.indexOf("createProvisionalWarranty", assessment));
  });

  it("classifies direct OCR text before parsing warranty fields", () => {
    const route = source("src/app/api/ocr/route.ts");
    const assessment = route.indexOf("const contentAssessment = assessUntrustedContent");
    expect(assessment).toBeGreaterThan(0);
    expect(assessment).toBeLessThan(route.indexOf("extractWarrantyFields(trimmedText)"));
  });

  it("stores and reports categorical concierge telemetry only", () => {
    const recorder = source("src/lib/server/agent-question-recorder.ts");
    const report = source("src/app/api/admin/agent-concierge/questions/route.ts");
    const admin = source("src/app/[locale]/admin/page.tsx");
    const migration = source(
      "supabase/migrations/20260904120000_harden_untrusted_content_telemetry.sql",
    );

    expect(recorder).toContain("question_redacted: null");
    expect(recorder).toContain("question_hash: null");
    expect(recorder).not.toContain("createHash");
    expect(report).not.toContain("question_redacted");
    expect(report).not.toContain("question_hash");
    expect(admin).not.toContain("question.question");
    expect(migration).toContain("set question_redacted = null");
    expect(migration).toContain("record_untrusted_content_event");
  });

  it("requires execution-time confirmation for every MCP mutation", () => {
    const mcp = source("tools/warrantee/mcp-server.mjs");
    for (const name of ["create_warranty", "update_warranty", "delete_warranty"]) {
      expect(mcp).toContain(`${name} requires confirm=true`);
    }
  });
});
