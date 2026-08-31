import dotenv from "dotenv";

dotenv.config({ path: ".env.production.local", override: false, quiet: true });
dotenv.config({ path: ".env.local", override: false, quiet: true });

const REQUIRED = [
  "E2E_USER_EMAIL",
  "E2E_USER_PASSWORD",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
];

const missing = REQUIRED.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error(
    [
      "Local authenticated E2E is not configured.",
      `Missing: ${missing.join(", ")}`,
      "Create a local ignored env file, load it in your shell, then rerun this check.",
      "Never commit the email, password, or service-role key.",
    ].join("\n")
  );
  process.exit(1);
}

console.log(JSON.stringify({ ok: true }, null, 2));
