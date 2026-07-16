import { createCanvas } from "@napi-rs/canvas";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import PDFDocument from "pdfkit";
import { signInWithPassword, watchForPageErrors } from "./helpers";

const shouldRun = process.env.OPERATIONAL_E2E === "1";
const hasCredentials = Boolean(process.env.E2E_USER_EMAIL && process.env.E2E_USER_PASSWORD);
const hasSupabaseAdmin = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const hasCronSecret = Boolean(process.env.CRON_SECRET);

const OCR_SAFE_CHARS = "BCDEFGHJKLMNPQRSTUVWXYZ";

function randomOcrSafeToken(length = 12) {
  return Array.from({ length }, () => OCR_SAFE_CHARS[Math.floor(Math.random() * OCR_SAFE_CHARS.length)]).join("");
}

function normalizeOcrAssertionText(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/[O0]/g, "0")
    .replace(/[I1L]/g, "1");
}

const runId = `QA-OPS-${randomOcrSafeToken()}`;

let qaUserId: string | null = null;
let activeWarrantyId: string | null = null;
let approveWarrantyId: string | null = null;
let rejectWarrantyId: string | null = null;
const createdDocumentStoragePaths = new Set<string>();

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

function missingColumn(message: string) {
  return message.match(/'([^']+)' column/)?.[1] || message.match(/column "?([a-zA-Z0-9_]+)"?/)?.[1] || null;
}

async function adaptiveUpsert(table: string, payload: Record<string, unknown>, onConflict?: string) {
  const supabase = adminClient();
  const draft = { ...payload };

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const { data, error } = await supabase
      .from(table)
      .upsert(draft, onConflict ? { onConflict } : undefined)
      .select()
      .single();
    if (!error) return data as Record<string, unknown>;

    const column = missingColumn(error.message || "");
    if (!column || !(column in draft)) throw error;
    delete draft[column];
  }

  throw new Error(`Could not seed ${table}; schema adaptation did not converge.`);
}

function warrantyPayload(referenceNumber: string, status: "active" | "pending_approval") {
  return {
    reference_number: referenceNumber,
    product_name: `${runId} Warranty ${status}`,
    product_name_ar: "ضمان اختبار تشغيلي",
    sku: `${runId}-${status}`,
    quantity: 1,
    start_date: "2026-01-01",
    end_date: "2028-01-01",
    purchase_date: "2026-01-01",
    warranty_start_date: "2026-01-01",
    warranty_end_date: "2028-01-01",
    description: "Seeded only for the explicit operational readiness E2E gate.",
    serial_number: `${runId}-${status}-SN`,
    category: "qa",
    product_category: "qa",
    seller_name: "QA Seller",
    seller_email: "qa-seller@warrantee.io",
    currency: "SAR",
    terms_and_conditions: "QA operational readiness terms.",
    source: "qa_operational_e2e",
    coverage_type: "standard",
    status,
    user_id: qaUserId,
    created_by: qaUserId,
    issuer_user_id: qaUserId,
    recipient_user_id: qaUserId,
    buyer_id: qaUserId,
    seller_id: qaUserId,
    updated_at: new Date().toISOString(),
  };
}

async function seedOperationalData() {
  const email = process.env.E2E_USER_EMAIL!;
  const supabase = adminClient();
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;

  const user = users.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error("E2E user does not exist in Supabase auth.");
  qaUserId = user.id;

  await adaptiveUpsert(
    "profiles",
    {
      id: user.id,
      email,
      full_name: "Warrantee QA User",
      role: "super_admin",
      preferred_language: "en",
      preferred_locale: "en",
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    },
    "id",
  );

  const activeWarranty = await adaptiveUpsert(
    "warranties",
    warrantyPayload(`${runId}-ACTIVE`, "active"),
    "reference_number",
  );
  const approvalWarranty = await adaptiveUpsert(
    "warranties",
    warrantyPayload(`${runId}-APPROVE`, "pending_approval"),
    "reference_number",
  );
  const rejectionWarranty = await adaptiveUpsert(
    "warranties",
    warrantyPayload(`${runId}-REJECT`, "pending_approval"),
    "reference_number",
  );

  activeWarrantyId = String(activeWarranty.id);
  approveWarrantyId = String(approvalWarranty.id);
  rejectWarrantyId = String(rejectionWarranty.id);
}

async function cleanupOperationalData() {
  const supabase = adminClient();
  const warrantyIds = [activeWarrantyId, approveWarrantyId, rejectWarrantyId].filter(Boolean) as string[];

  if (warrantyIds.length > 0) {
    const { data: docs } = await supabase
      .from("warranty_documents")
      .select("id, storage_path, warranty_id")
      .in("warranty_id", warrantyIds);

    for (const doc of docs || []) {
      if (doc.storage_path) createdDocumentStoragePaths.add(doc.storage_path);
    }

    if (createdDocumentStoragePaths.size > 0) {
      await supabase.storage.from("warranty-documents").remove(Array.from(createdDocumentStoragePaths));
    }

    await supabase.from("warranty_extensions").delete().in("warranty_id", warrantyIds);
    await supabase.from("warranty_documents").delete().in("warranty_id", warrantyIds);
    await supabase.from("activity_log").delete().eq("entity_type", "warranty").in("entity_id", warrantyIds);
    await supabase.from("notifications").delete().in("warranty_id", warrantyIds);
    await supabase.from("warranties").delete().in("id", warrantyIds);
  }

  const { data: imported } = await supabase
    .from("warranties")
    .select("id")
    .ilike("product_name", `${runId}%`);
  const importedIds = (imported || []).map((warranty) => warranty.id).filter(Boolean);
  if (importedIds.length > 0) {
    await supabase.from("warranties").delete().in("id", importedIds);
  }
}

async function expectResponseStatus(response: { status(): number; text(): Promise<string> }, expected: number) {
  if (response.status() !== expected) {
    throw new Error(`Expected status ${expected}, received ${response.status()}: ${await response.text()}`);
  }
}

async function pdfBuffer(text: string) {
  const doc = new PDFDocument({ size: "A4", margin: 48 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  doc.fontSize(18).text(text);
  doc.end();
  return done;
}

function pngBuffer(text: string) {
  const canvas = createCanvas(1200, 420);
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, 1200, 420);
  context.fillStyle = "#111111";
  context.font = "40px Arial";
  text.split("\n").forEach((line, index) => {
    context.fillText(line, 48, 80 + index * 64);
  });
  return canvas.toBuffer("image/png");
}

test.describe("fully operational production workflows", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!shouldRun, "Set OPERATIONAL_E2E=1 to run the destructive operational readiness gate.");
  test.skip(!hasCredentials, "Set E2E_USER_EMAIL and E2E_USER_PASSWORD.");
  test.skip(!hasSupabaseAdmin, "Set Supabase admin env vars for seeding and cleanup.");

  test.beforeAll(async () => {
    await seedOperationalData();
  });

  test.afterAll(async () => {
    await cleanupOperationalData();
  });

  test.beforeEach(async ({ page }) => {
    await signInWithPassword(page);
  });

  test("bulk import, approval, rejection, document upload, payment checkout, OCR, and team guardrails work", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    const errors = watchForPageErrors(page, testInfo);
    expect(activeWarrantyId).toBeTruthy();
    expect(approveWarrantyId).toBeTruthy();
    expect(rejectWarrantyId).toBeTruthy();

    const csv = [
      "product_name,start_date,end_date,serial_number,sku,seller_name,seller_email",
      `${runId} Imported Warranty,2026-02-01,2027-02-01,${runId}-IMPORT-SN,${runId}-IMPORT,QA Seller,qa-seller@warrantee.io`,
    ].join("\n");
    const importResponse = await page.request.post("/api/warranties/bulk-import", {
      multipart: {
        file: {
          name: `${runId}-bulk.csv`,
          mimeType: "text/csv",
          buffer: Buffer.from(csv),
        },
      },
    });
    expect(importResponse.status()).toBe(200);
    const importPayload = await importResponse.json();
    expect(importPayload.imported).toBe(1);

    const approveResponse = await page.request.post(`/api/warranties/${approveWarrantyId}/approve`);
    expect(approveResponse.status()).toBe(200);
    await expect.poll(async () => {
      const { data } = await adminClient().from("warranties").select("status").eq("id", approveWarrantyId).single();
      return data?.status;
    }).toBe("active");

    const rejectResponse = await page.request.post(`/api/warranties/${rejectWarrantyId}/reject`, {
      data: { reason: "Operational QA rejection path verification." },
    });
    expect(rejectResponse.status()).toBe(200);
    await expect.poll(async () => {
      const { data } = await adminClient().from("warranties").select("status").eq("id", rejectWarrantyId).single();
      return data?.status;
    }).toBe("cancelled");

    const proof = await pdfBuffer(`Product: ${runId} Document Upload\nSerial: ${runId}-DOC-SN\nWarranty: 2026-01-01 to 2028-01-01`);
    const documentResponse = await page.request.post(`/api/warranties/${activeWarrantyId}/documents`, {
      multipart: {
        documentKind: "original_proof",
        sourceContext: "operational_e2e",
        file: {
          name: `${runId}-original-proof.pdf`,
          mimeType: "application/pdf",
          buffer: proof,
        },
      },
    });
    expect(documentResponse.status()).toBe(201);
    const documentPayload = await documentResponse.json();
    expect(documentPayload.id).toBeTruthy();
    if (documentPayload.provenance?.storage_path) {
      createdDocumentStoragePaths.add(documentPayload.provenance.storage_path);
    }

    const documentsResponse = await page.request.get(`/api/warranties/${activeWarrantyId}/documents`);
    expect(documentsResponse.status()).toBe(200);
    expect(JSON.stringify(await documentsResponse.json())).toContain(`${runId}-original-proof.pdf`);

    const downloadResponse = await page.request.get(`/api/documents/${documentPayload.id}/download`);
    if (downloadResponse.status() === 423) {
      expect(hasCronSecret).toBe(true);
      const scanResponse = await page.request.post("/api/cron/scan-documents?limit=5", {
        headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
      });
      expect(scanResponse.status()).toBe(200);
      const scanPayload = await scanResponse.json();
      expect(scanPayload.configured).toBe(true);

      await expect.poll(async () => {
        const { data } = await adminClient()
          .from("warranty_documents")
          .select("security_status")
          .eq("id", documentPayload.id)
          .single();
        return data?.security_status;
      }).toBe("clean");

      const scannedDownloadResponse = await page.request.get(`/api/documents/${documentPayload.id}/download`);
      expect([200, 302]).toContain(scannedDownloadResponse.status());
    } else {
      expect([200, 302]).toContain(downloadResponse.status());
    }

    const deleteDocumentResponse = await page.request.delete(`/api/documents/${documentPayload.id}`);
    expect(deleteDocumentResponse.status()).toBe(200);
    const documentsAfterDeleteResponse = await page.request.get(`/api/warranties/${activeWarrantyId}/documents`);
    expect(documentsAfterDeleteResponse.status()).toBe(200);
    expect(JSON.stringify(await documentsAfterDeleteResponse.json())).not.toContain(`${runId}-original-proof.pdf`);

    const ocrTextResponse = await page.request.post("/api/ocr", {
      data: {
        text: `Product: ${runId} OCR Text Warranty\nSerial: ${runId}-OCR-TEXT\nPurchase Date: 2026-01-01\nExpiry Date: 2028-01-01\nSeller: QA Seller`,
      },
    });
    await expectResponseStatus(ocrTextResponse, 200);
    const ocrTextPayload = await ocrTextResponse.json();
    expect(ocrTextPayload.success).toBe(true);
    expect(ocrTextPayload.ocr?.provider).toBe("submitted_text");
    expect(ocrTextPayload.ocr?.engine).toBe("submitted_text");
    expect(JSON.stringify(ocrTextPayload.fields)).toContain(runId);

    const ocrPdf = await pdfBuffer(
      `Product: ${runId} OCR PDF Warranty\nSerial: ${runId}-OCR-PDF\nWarranty period: 2 years\nSeller: QA Seller`,
    );
    const ocrPdfResponse = await page.request.post("/api/ocr", {
      data: {
        image: `data:application/pdf;base64,${ocrPdf.toString("base64")}`,
      },
    });
    await expectResponseStatus(ocrPdfResponse, 200);
    const ocrPdfPayload = await ocrPdfResponse.json();
    expect(ocrPdfPayload.success).toBe(true);
    expect(["pdfjs", "mistral", "tesseract"]).toContain(ocrPdfPayload.ocr?.provider);
    expect(["pdf_text", "pdf_tesseract", "mistral_ocr", "tesseract"]).toContain(ocrPdfPayload.ocr?.engine);
    expect(ocrPdfPayload.text).toContain(runId);

    const teamResponse = await page.request.get("/api/team/members");
    expect(teamResponse.status()).toBe(200);
    const teamPayload = await teamResponse.json();
    expect(teamPayload.canManage).toBe(true);

    const crossDomainInvite = await page.request.post("/api/team/members", {
      data: { email: `${runId.toLowerCase()}@example.com`, role: "viewer" },
    });
    expect(crossDomainInvite.status()).toBe(422);

    const missingAccountInvite = await page.request.post("/api/team/members", {
      data: { email: `${runId.toLowerCase()}@warrantee.io`, role: "viewer" },
    });
    expect(missingAccountInvite.status()).toBe(404);

    const selfDelete = await page.request.delete("/api/team/members", {
      data: { memberId: qaUserId },
    });
    expect(selfDelete.status()).toBe(422);

    const ocrImage = pngBuffer(
      `Product: ${runId} OCR Image Warranty\nSerial: ${runId}-OCR-IMG\nWarranty: 2026-01-01 to 2028-01-01\nSeller: QA Seller`,
    );
    const ocrImageResponse = await page.request.post("/api/ocr", {
      data: {
        image: `data:image/png;base64,${ocrImage.toString("base64")}`,
      },
    });
    await expectResponseStatus(ocrImageResponse, 200);
    const ocrImagePayload = await ocrImageResponse.json();
    expect(ocrImagePayload.success).toBe(true);
    expect(["mistral", "google_vision", "tesseract"]).toContain(ocrImagePayload.ocr?.provider);
    expect(["mistral_ocr", "google_document_text_detection", "tesseract"]).toContain(ocrImagePayload.ocr?.engine);
    const normalizedOcrText = normalizeOcrAssertionText(ocrImagePayload.text);
    expect(normalizedOcrText).toContain(normalizeOcrAssertionText(runId).slice(0, 12));
    expect(normalizedOcrText).toContain(normalizeOcrAssertionText("OCR Image"));
    expect(normalizedOcrText).toContain(normalizeOcrAssertionText("Warrant"));
    expect(normalizedOcrText).toContain(normalizeOcrAssertionText("QA Seller"));

    const { data: extension, error: extensionError } = await adminClient()
      .from("warranty_extensions")
      .insert({
        warranty_id: activeWarrantyId,
        new_end_date: "2029-01-01",
        price: 150,
        currency: "SAR",
        commission_rate: 8,
        commission_amount: 12,
        terms: "Operational QA seller-approved extension offer.",
        offered_by: qaUserId,
        is_purchased: false,
      })
      .select("id")
      .single();
    expect(extensionError).toBeNull();
    expect(extension?.id).toBeTruthy();
    const extensionId = extension!.id;

    const checkoutResponse = await page.request.post("/api/payments/create", {
      data: {
        warrantyId: activeWarrantyId,
        extensionId,
        extensionMonths: 12,
        provider: "stripe",
        locale: "en",
        returnUrl: "https://warrantee.io",
      },
    });
    await expectResponseStatus(checkoutResponse, 200);
    const checkoutPayload = await checkoutResponse.json();
    expect(checkoutPayload.provider).toBe("stripe");
    expect(checkoutPayload.sessionId).toBeTruthy();
    expect(checkoutPayload.url).toMatch(/^https:\/\/checkout\.stripe\.com\//);

    await errors.assertClean();
  });
});
