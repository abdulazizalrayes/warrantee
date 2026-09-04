import assert from "node:assert/strict";
import test from "node:test";

import { buildCloudRunService } from "./cloud-run-config.mjs";

const validInput = {
  projectId: "warrantee-491217",
  projectNumber: "123456789012",
  region: "me-central2",
  scannerImage: "me-central2-docker.pkg.dev/warrantee-491217/warrantee-security/clamav-scanner:git-abc123",
  allowedDocumentOrigin: "https://erptubrslnfmkuouczgn.supabase.co",
  secretName: "warrantee-clamav-scanner-token",
};

test("builds a Warrantee-only, scale-to-zero Cloud Run service", () => {
  const service = buildCloudRunService(validInput);
  assert.equal(service.metadata.name, "warrantee-clamav-scanner");
  assert.equal(service.metadata.labels["cloud.googleapis.com/location"], "me-central2");
  assert.equal(service.spec.template.metadata.annotations["autoscaling.knative.dev/minScale"], "0");
  assert.equal(service.spec.template.metadata.annotations["autoscaling.knative.dev/maxScale"], "1");
  assert.equal(service.spec.template.spec.containerConcurrency, 1);
  assert.equal(service.spec.template.spec.timeoutSeconds, 120);
  assert.equal(
    service.spec.template.spec.serviceAccountName,
    "warrantee-clamav-scanner@warrantee-491217.iam.gserviceaccount.com",
  );
  assert.equal(service.spec.template.spec.containers.length, 2);
  assert.equal(service.spec.template.spec.containers[1].image, "docker.io/clamav/clamav:1.5.3");
});

test("references Secret Manager and never serializes the token value", () => {
  const serialized = JSON.stringify(buildCloudRunService(validInput));
  assert.match(serialized, /warrantee-clamav-scanner-token/);
  assert.match(serialized, /secretKeyRef/);
  assert.doesNotMatch(serialized, /SCANNER_TOKEN_VALUE/);
});

test("requires the exact Warrantee project, Dammam region, and immutable image", () => {
  assert.throws(() => buildCloudRunService({ ...validInput, projectId: "other-company" }), /warrantee-491217/);
  assert.throws(() => buildCloudRunService({ ...validInput, region: "us-central1" }), /me-central2/);
  assert.throws(() => buildCloudRunService({ ...validInput, scannerImage: "example.com/scanner:latest" }), /Artifact Registry/);
  assert.throws(() => buildCloudRunService({
    ...validInput,
    scannerImage: "me-central2-docker.pkg.dev/warrantee-491217/warrantee-security/clamav-scanner:latest",
  }), /immutable version tag/);
});

test("rejects non-origin document hosts", () => {
  assert.throws(() => buildCloudRunService({
    ...validInput,
    allowedDocumentOrigin: "https://erptubrslnfmkuouczgn.supabase.co/storage/v1",
  }), /HTTPS origin/);
  assert.throws(() => buildCloudRunService({
    ...validInput,
    allowedDocumentOrigin: "https://another-company.supabase.co",
  }), /Warrantee Supabase origin/);
});
