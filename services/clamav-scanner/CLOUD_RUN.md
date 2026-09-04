# Warrantee ClamAV Cloud Run Runbook

This runbook is locked to the Warrantee Google Cloud project and must not be reused for another company without changing and reviewing every identity boundary.

## Identity Lock

- Google account: `abdulaziz.alrayes@gmail.com`
- Google Cloud project: `Warrantee` / `warrantee-491217`
- Region: `me-central2` (Dammam)
- Service: `warrantee-clamav-scanner`
- Service account: `warrantee-clamav-scanner@warrantee-491217.iam.gserviceaccount.com`
- Artifact Registry repository: `warrantee-security`
- Secret Manager secret: `warrantee-clamav-scanner-token`

Do not use the shared Paperclip droplet or the CRM Email Intelligence application. Customer documents and scanner credentials must remain in Warrantee-owned infrastructure.

## Current Blocker

As verified on 5 September 2026, the project has no active Google Cloud billing profile and displays `Start your Free Trial`. Cloud Run resource creation is therefore blocked until the owner explicitly activates the trial or billing. Activation can create future charges even when expected usage stays within free allowances.

Do not enable APIs, create resources, or attach billing without fresh owner approval at execution time.

## Deployment Shape

The generated Cloud Run service uses:

- request-based billing, minimum instances `0`, maximum instances `1`;
- concurrency `1` and a 120-second request timeout;
- an ingress Node.js wrapper with exact bearer authentication, bounded downloads, URL allowlisting, and a global authenticated scan limit;
- a non-ingress `docker.io/clamav/clamav:1.5.3` sidecar reachable only on the shared container network;
- 512 MiB for the wrapper and 4 GiB for ClamAV, matching the official preferred memory guidance;
- startup probes and explicit dependency ordering so the wrapper starts only after `clamd` is ready;
- Secret Manager, with a dedicated least-privilege service account;
- Dammam processing and no persistent document storage.

Scale-to-zero keeps idle compute cost at zero, but the first request can be slower and the ClamAV signature volume is not persistent. The official image refreshes its database when an instance starts; version and signature freshness must be checked after every release and during weekly operations.

## Owner-Approved Deployment

Run these commands only after billing activation is explicitly approved. Use Google Cloud Shell so the account and project are visible before each consequential step.

```bash
gcloud auth list --filter=status:ACTIVE --format='value(account)'
gcloud config set project warrantee-491217
gcloud config get-value project

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com

gcloud artifacts repositories create warrantee-security \
  --repository-format=docker \
  --location=me-central2 \
  --description='Warrantee-only security service images'

gcloud iam service-accounts create warrantee-clamav-scanner \
  --display-name='Warrantee ClamAV scanner'
```

Create `warrantee-clamav-scanner-token` in Secret Manager through the console. Generate a new random token and enter it once in Secret Manager and once in the Warrantee Vercel Production environment. Never paste it into source control, documentation, logs, tickets, or chat.

Grant the dedicated service account access to that secret only:

```bash
gcloud secrets add-iam-policy-binding warrantee-clamav-scanner-token \
  --member='serviceAccount:warrantee-clamav-scanner@warrantee-491217.iam.gserviceaccount.com' \
  --role='roles/secretmanager.secretAccessor'
```

Build the immutable wrapper image from the repository root:

```bash
export GCP_PROJECT_ID=warrantee-491217
export GCP_REGION=me-central2
export GCP_PROJECT_NUMBER="$(gcloud projects describe "$GCP_PROJECT_ID" --format='value(projectNumber)')"
export SCANNER_IMAGE="me-central2-docker.pkg.dev/$GCP_PROJECT_ID/warrantee-security/clamav-scanner:git-$(git rev-parse --short=12 HEAD)"
gcloud builds submit services/clamav-scanner --tag "$SCANNER_IMAGE"
```

Set `ALLOWED_DOCUMENT_ORIGIN` to the exact HTTPS origin from the existing Warrantee `NEXT_PUBLIC_SUPABASE_URL`. The generator fails unless it equals `https://erptubrslnfmkuouczgn.supabase.co`, preventing a cross-company storage boundary. Then render and apply the service configuration:

```bash
export SCANNER_SECRET_NAME=warrantee-clamav-scanner-token
node services/clamav-scanner/cloud-run-config.mjs > /tmp/warrantee-clamav-cloud-run.json
gcloud run services replace /tmp/warrantee-clamav-cloud-run.json --region=me-central2
gcloud run services add-iam-policy-binding warrantee-clamav-scanner \
  --region=me-central2 \
  --member=allUsers \
  --role=roles/run.invoker
```

The service must be publicly invokable because Vercel does not have a Google service identity. The application-level bearer token is mandatory, and the service fails closed. Maximum instances and concurrency bound cost and resource abuse.

## Cutover Gate

Do not replace the current heuristic scanner URL until all checks pass:

1. `GET /healthz` returns `status=ok`, `engine=clamav`, and a current database version.
2. An unauthenticated `POST /v1/scan` returns `401`.
3. A valid clean file returns `clean`.
4. An isolated EICAR test file returns `422`, `blocked`, and `malware_detected`.
5. No raw signed URL, token, document content, filename, or customer identifier appears in Cloud Run logs.
6. A cold-start scan completes inside 90 seconds.
7. Warrantee production readiness, security gates, email ingestion, and document-download controls pass.

Use the non-secret automated checks after deployment:

```bash
SCANNER_BASE_URL='https://SERVICE_URL' \
SCANNER_TOKEN='set-locally-without-logging' \
npm run qa:clamav-live
```

After the gate passes, set these Warrantee Vercel Production values:

```text
DOCUMENT_SECURITY_SCANNER_URL=https://SERVICE_URL/v1/scan
DOCUMENT_SECURITY_SCANNER_TOKEN=<same rotated Secret Manager value>
DOCUMENT_SECURITY_SCANNER_TIMEOUT_MS=90000
DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1
```

Redeploy Warrantee, run CI and Production Security Gates, then verify one clean document and one isolated EICAR object. Remove both test objects immediately and confirm no QA record remains.

## Rollback

Restore `DOCUMENT_SECURITY_SCANNER_URL` to `https://warrantee.io/api/internal/document-security-scan`, keep `DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1`, redeploy, and rerun production readiness. Then set Cloud Run traffic to zero or delete only the `warrantee-clamav-scanner` service after confirming rollback. Do not delete the Artifact Registry repository, secret, or audit logs during incident response.
