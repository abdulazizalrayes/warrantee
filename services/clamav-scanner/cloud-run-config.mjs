import { pathToFileURL } from "node:url";

const PROJECT_ID = "warrantee-491217";
const DEFAULT_REGION = "me-central2";
const DEFAULT_SERVICE = "warrantee-clamav-scanner";
const DEFAULT_SECRET = "warrantee-clamav-scanner-token";
const CLAMAV_IMAGE = "docker.io/clamav/clamav:1.5.3";
const SERVICE_ACCOUNT = `warrantee-clamav-scanner@${PROJECT_ID}.iam.gserviceaccount.com`;
const DOCUMENT_ORIGIN = "https://erptubrslnfmkuouczgn.supabase.co";

function required(value, name) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
}

function validateOrigin(value) {
  const origin = new URL(required(value, "ALLOWED_DOCUMENT_ORIGIN"));
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/") {
    throw new Error("ALLOWED_DOCUMENT_ORIGIN must be an HTTPS origin without credentials or a path");
  }
  if (origin.origin !== DOCUMENT_ORIGIN) {
    throw new Error(`ALLOWED_DOCUMENT_ORIGIN must be the Warrantee Supabase origin ${DOCUMENT_ORIGIN}`);
  }
  return DOCUMENT_ORIGIN;
}

function validateImage(value) {
  const image = required(value, "SCANNER_IMAGE");
  if (!image.startsWith(`${DEFAULT_REGION}-docker.pkg.dev/${PROJECT_ID}/`)) {
    throw new Error(`SCANNER_IMAGE must use the Warrantee ${DEFAULT_REGION} Artifact Registry`);
  }
  if (image.endsWith(":latest")) throw new Error("SCANNER_IMAGE must use an immutable version tag");
  return image;
}

export function buildCloudRunService(input) {
  const projectId = required(input.projectId, "GCP_PROJECT_ID");
  if (projectId !== PROJECT_ID) throw new Error(`GCP_PROJECT_ID must be ${PROJECT_ID}`);

  const projectNumber = required(input.projectNumber, "GCP_PROJECT_NUMBER");
  if (!/^\d{6,20}$/.test(projectNumber)) throw new Error("GCP_PROJECT_NUMBER must be numeric");

  const region = input.region || DEFAULT_REGION;
  if (region !== DEFAULT_REGION) throw new Error(`GCP_REGION must be ${DEFAULT_REGION}`);

  const scannerImage = validateImage(input.scannerImage);
  const allowedDocumentOrigin = validateOrigin(input.allowedDocumentOrigin);
  const secretName = input.secretName || DEFAULT_SECRET;
  if (!/^[a-z][a-z0-9-]{2,254}$/.test(secretName)) throw new Error("SCANNER_SECRET_NAME is invalid");

  return {
    apiVersion: "serving.knative.dev/v1",
    kind: "Service",
    metadata: {
      name: DEFAULT_SERVICE,
      namespace: projectNumber,
      labels: { "cloud.googleapis.com/location": region },
      annotations: {
        "run.googleapis.com/description": "Warrantee-only ClamAV document scanner",
        "run.googleapis.com/ingress": "all",
      },
    },
    spec: {
      template: {
        metadata: {
          annotations: {
            "autoscaling.knative.dev/minScale": "0",
            "autoscaling.knative.dev/maxScale": "1",
            "run.googleapis.com/container-dependencies": JSON.stringify({ scanner: ["clamav"] }),
            "run.googleapis.com/cpu-throttling": "true",
            "run.googleapis.com/execution-environment": "gen2",
            "run.googleapis.com/startup-cpu-boost": "true",
          },
        },
        spec: {
          containerConcurrency: 1,
          timeoutSeconds: 120,
          serviceAccountName: SERVICE_ACCOUNT,
          containers: [
            {
              name: "scanner",
              image: scannerImage,
              ports: [{ name: "http1", containerPort: 8080 }],
              env: [
                { name: "ALLOWED_DOCUMENT_ORIGIN", value: allowedDocumentOrigin },
                { name: "CLAMD_HOST", value: "127.0.0.1" },
                { name: "CLAMD_PORT", value: "3310" },
                { name: "MAX_FILE_BYTES", value: "10485760" },
                { name: "SCAN_RATE_LIMIT_PER_MINUTE", value: "30" },
                {
                  name: "SCANNER_TOKEN",
                  valueFrom: { secretKeyRef: { name: secretName, key: "latest" } },
                },
              ],
              resources: { limits: { cpu: "1000m", memory: "512Mi" } },
              startupProbe: {
                tcpSocket: { port: 8080 },
                periodSeconds: 2,
                timeoutSeconds: 1,
                failureThreshold: 30,
              },
            },
            {
              name: "clamav",
              image: CLAMAV_IMAGE,
              resources: { limits: { cpu: "1000m", memory: "4Gi" } },
              startupProbe: {
                tcpSocket: { port: 3310 },
                periodSeconds: 2,
                timeoutSeconds: 1,
                failureThreshold: 90,
              },
            },
          ],
        },
      },
    },
  };
}

function fromEnvironment() {
  return buildCloudRunService({
    projectId: process.env.GCP_PROJECT_ID,
    projectNumber: process.env.GCP_PROJECT_NUMBER,
    region: process.env.GCP_REGION,
    scannerImage: process.env.SCANNER_IMAGE,
    allowedDocumentOrigin: process.env.ALLOWED_DOCUMENT_ORIGIN,
    secretName: process.env.SCANNER_SECRET_NAME,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.stdout.write(`${JSON.stringify(fromEnvironment(), null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
