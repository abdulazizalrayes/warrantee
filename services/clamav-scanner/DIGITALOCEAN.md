# Warrantee ClamAV DigitalOcean Runbook

This is the owner-approved early-launch runtime for Warrantee document malware scanning. It uses spare capacity on the existing DigitalOcean Droplet without sharing application directories, databases, object stores, Docker networks, volumes, or secrets with the other workloads on that host.

## What ClamAV Adds

The active Warrantee baseline scanner validates size, declared and detected file type, extension/MIME consistency, malformed structures, hashes, quarantine state, authorization, and clean-before-download policy. Those controls reject many unsafe or deceptive files, but they do not compare file contents with an antivirus signature database.

ClamAV is free and open-source antivirus software. The software has no license or per-scan charge. It detects known malware signatures inside files that can otherwise look like valid PDFs or images. Hosting still consumes CPU, memory, disk, and network resources; this deployment uses capacity already included in the current Droplet subscription.

ClamAV is not OCR. OCR extracts text and warranty fields. ClamAV decides whether a file is safe enough to continue into OCR and controlled download workflows.

## Identity And Isolation Lock

- Company: Warrantee only
- Public scanner hostname: `scanner.warrantee.io`
- Docker Compose project: `warrantee-clamav`
- Host path: `/opt/warrantee-clamav`
- Secret path: `/etc/warrantee-clamav/scanner.env`, root-readable only
- Local wrapper port: `127.0.0.1:8787`
- Docker networks: `warrantee-clamav-egress` and internal-only `warrantee-clamav-internal`
- Persistent volume: `warrantee-clamav-signatures`
- Allowed document origin: the exact Warrantee Supabase project origin

The scanner does not mount Paperclip, JFCO, Hadhr, CRM, Postgres, MinIO, or application directories or volumes. ClamAV port `3310` is not published. Documents are downloaded into bounded process memory, streamed to `clamd`, and not retained in a file volume. Only antivirus signatures persist.

This is logical container isolation on one Linux kernel. It is appropriate for the owner-approved early launch, but it is not equivalent to a dedicated Droplet. Move the unchanged Compose project to a dedicated DigitalOcean Droplet before sustained customer volume, stricter data-residency commitments, or enterprise security review.

## Resource Boundaries

- ClamAV: 4 GiB memory, 1.5 CPU, 512 PIDs
- Wrapper: 512 MiB memory, 0.5 CPU, 128 PIDs
- Scanner concurrency is bounded by the application and the wrapper has a maximum 30 authenticated scans per minute.
- Container logs rotate at 10 MiB with three files.
- The wrapper filesystem is read-only and drops all Linux capabilities.

Current host capacity must be rechecked before every deployment. Stop if at least 6 GiB of memory is not available or if `127.0.0.1:8787` is already occupied.

## Deployment

The canonical source is `abdulazizalrayes/warrantee` on `main`. Deploy an exact reviewed commit, not a mutable branch tip.

```bash
install -d -m 0750 /opt/warrantee-clamav/releases /etc/warrantee-clamav
git clone --filter=blob:none --no-checkout \
  https://github.com/abdulazizalrayes/warrantee.git \
  /opt/warrantee-clamav/source
cd /opt/warrantee-clamav/source
git fetch --depth=1 origin COMMIT_SHA
git checkout --detach COMMIT_SHA

umask 077
cat >/etc/warrantee-clamav/scanner.env <<'EOF'
ALLOWED_DOCUMENT_ORIGIN=https://erptubrslnfmkuouczgn.supabase.co
SCANNER_TOKEN=GENERATE_A_NEW_RANDOM_TOKEN
SCANNER_BIND_PORT=8787
EOF
chmod 0600 /etc/warrantee-clamav/scanner.env

cd services/clamav-scanner
docker compose --project-name warrantee-clamav \
  --env-file /etc/warrantee-clamav/scanner.env \
  up -d --build
```

Install the reviewed Nginx configuration as its own site, test Nginx before reloading, then obtain a certificate for `scanner.warrantee.io`. Do not replace or edit another company’s site file.

```bash
install -m 0644 nginx-scanner.conf /etc/nginx/sites-available/warrantee-clamav.conf
ln -sfn /etc/nginx/sites-available/warrantee-clamav.conf \
  /etc/nginx/sites-enabled/warrantee-clamav.conf
nginx -t
systemctl reload nginx
certbot --nginx -d scanner.warrantee.io --redirect --non-interactive --agree-tos \
  --email abdulaziz.alrayes@gmail.com
```

## Cutover Gate

Do not change Warrantee’s production scanner URL until all checks pass:

1. `GET /healthz` returns `status=ok` and `engine=clamav`.
2. Unauthenticated `POST /v1/scan` returns `401`.
3. A clean isolated fixture is reported clean.
4. The standard EICAR antivirus fixture is blocked by ClamAV.
5. No token, signed URL, document content, filename, or customer identifier appears in logs.
6. Paperclip and every pre-existing container remain healthy within their prior resource envelope.
7. Warrantee CI and Production Security Gates pass after the Vercel cutover.

The same random scanner token is stored only in the root-readable Droplet environment file and the Warrantee Vercel Production environment. Never print it in logs or documentation.

Set these Vercel Production values after the gate passes:

```text
DOCUMENT_SECURITY_SCANNER_URL=https://scanner.warrantee.io/v1/scan
DOCUMENT_SECURITY_SCANNER_TOKEN=<same private scanner token>
DOCUMENT_SECURITY_SCANNER_TIMEOUT_MS=90000
DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1
```

## Rollback

Restore `DOCUMENT_SECURITY_SCANNER_URL` to `https://warrantee.io/api/internal/document-security-scan`, keep `DOCUMENT_DOWNLOAD_REQUIRE_CLEAN=1`, redeploy Warrantee, and rerun production readiness. Then stop only the `warrantee-clamav` Compose project:

```bash
cd /opt/warrantee-clamav/source/services/clamav-scanner
docker compose --project-name warrantee-clamav \
  --env-file /etc/warrantee-clamav/scanner.env stop
```

Do not run `down -v` during incident response because it deletes the isolated signature volume. Do not modify or restart unrelated containers.
