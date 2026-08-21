import { spawnSync } from "node:child_process";

const includeProduction = process.argv.includes("--production");
const staticSteps = [
  { name: "production dependency audit", command: "npm", args: ["audit", "--omit=dev", "--audit-level=high"] },
  { name: "loopback and production URL guard", command: "npm", args: ["run", "guard:loopback"] },
  { name: "database migration integrity", command: "npm", args: ["run", "qa:migrations"] },
  { name: "pentest scope readiness", command: "npm", args: ["run", "qa:pentest-readiness"] },
  {
    name: "focused security regression suite",
    command: "npm",
    args: [
      "test", "--", "--run",
      "src/lib/__tests__/auth-email-guard.test.ts",
      "src/lib/__tests__/email-ingestion-auth.test.ts",
      "src/lib/__tests__/ingestion-attachments.test.ts",
      "src/lib/__tests__/operational-hardening.test.ts",
      "src/lib/__tests__/profile-role-hardening.test.ts",
      "src/lib/__tests__/takeover-remediation.test.ts",
      "src/lib/__tests__/warranty-access.test.ts",
      "src/lib/__tests__/warranty-document-provenance.test.ts",
      "src/lib/server/__tests__/document-security-baseline.test.ts",
    ],
  },
];

const results = [];
function runStep(step) {
  console.log(`\n[security-assurance] ${step.name}`);
  const startedAt = Date.now();
  const result = spawnSync(step.command, step.args, { stdio: "inherit", env: process.env });
  const passed = result.status === 0;
  results.push({ name: step.name, passed, durationMs: Date.now() - startedAt });
  return { passed, status: result.status || 1 };
}

for (const step of staticSteps) {
  const result = runStep(step);
  if (!result.passed) {
    console.error(JSON.stringify({ ok: false, classification: "internal_adversarial_assurance", results }, null, 2));
    process.exit(result.status);
  }
}

if (includeProduction) {
  const smoke = runStep({ name: "production smoke", command: "npm", args: ["run", "smoke:prod"] });
  if (!smoke.passed) {
    console.error(JSON.stringify({ ok: false, classification: "internal_adversarial_assurance", results }, null, 2));
    process.exit(smoke.status);
  }

  const ensure = runStep({ name: "create disposable QA identity", command: "npm", args: ["run", "qa:user:ensure"] });
  let productionFailure = ensure.passed ? 0 : ensure.status;

  if (ensure.passed) {
    for (const step of [
      { name: "production operational readiness", command: "npm", args: ["run", "readiness:operational"] },
      { name: "Supabase anonymous and authenticated RLS probe", command: "npm", args: ["run", "security:rls-probe"] },
    ]) {
      const result = runStep(step);
      if (!result.passed && productionFailure === 0) productionFailure = result.status;
    }
  }

  const cleanup = runStep({ name: "remove disposable QA identity and artifacts", command: "npm", args: ["run", "qa:user:cleanup"] });
  const clean = runStep({ name: "verify no persistent QA identity remains", command: "npm", args: ["run", "qa:user:verify-clean"] });
  if (!cleanup.passed && productionFailure === 0) productionFailure = cleanup.status;
  if (!clean.passed && productionFailure === 0) productionFailure = clean.status;

  if (productionFailure !== 0) {
    console.error(JSON.stringify({ ok: false, classification: "internal_adversarial_assurance", results }, null, 2));
    process.exit(productionFailure);
  }
}

console.log(JSON.stringify({
  ok: true,
  classification: "internal_adversarial_assurance",
  independentPentest: false,
  productionChecksIncluded: includeProduction,
  results,
  caveat: "This gate reduces risk but is not an independent third-party penetration test or certification.",
}, null, 2));
