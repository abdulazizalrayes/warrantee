import { readFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

interface CspManifest {
  schemaVersion: number;
  complete: boolean;
  buildId: string;
  routes: Record<string, { policy: string; htmlSha256: string }>;
  fallbackHashes?: string[];
}

let manifest: CspManifest | undefined;

export function getDocumentCsp(pathname: string, basePolicy: string) {
  if (process.env.NODE_ENV !== "production") return { policy: basePolicy, nonce: null };
  if (!manifest) {
    const parsed = JSON.parse(readFileSync(join(process.cwd(), ".warrantee-csp/static-routes.json"), "utf8"));
    if (parsed.schemaVersion !== 1 || parsed.complete !== true || !parsed.buildId || !parsed.routes) {
      throw new Error("Final-build CSP manifest is unavailable");
    }
    manifest = parsed;
  }
  if (Object.prototype.hasOwnProperty.call(manifest!.routes, pathname)) {
    const entry = manifest!.routes[pathname];
    if (!entry.policy || entry.policy.includes("script-src 'self' 'unsafe-inline'")) {
      throw new Error("Invalid static CSP policy");
    }
    return { policy: entry.policy, nonce: null };
  }
  const nonce = randomBytes(24).toString("base64");
  const hashes = manifest!.fallbackHashes || [];
  if (hashes.some((hash) => !/^'sha256-[A-Za-z0-9+/]{43}='$/.test(hash))) {
    throw new Error("Invalid error-page CSP hashes");
  }
  const policy = basePolicy.split(";").map((part) => {
    const directive = part.trim();
    if (directive.startsWith("style-src-elem ")) return `${directive} 'nonce-${nonce}'`;
    if (!directive.startsWith("script-src ")) return directive;
    const sources = directive.split(/\s+/).filter((source) => source !== "'unsafe-inline'");
    return [...sources, `'nonce-${nonce}'`, ...hashes].join(" ");
  }).join("; ");
  return { policy, nonce };
}
