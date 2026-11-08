import { randomBytes } from "node:crypto";
import { contentSecurityPolicy } from "./csp-policy.mjs";

export function withCertificateCsp<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args) => {
    let response: Response;
    try {
      response = await handler(...args);
    } catch {
      console.error("Certificate response failed", { category: "certificate_unavailable" });
      response = Response.json({ error: "Certificate unavailable" }, {
        status: 500,
        headers: { "Cache-Control": "private, no-store" },
      });
    }
    if (!response.headers.has("Content-Security-Policy")) {
      response.headers.set("Content-Security-Policy", contentSecurityPolicy);
    }
    return response;
  };
}

export function createCertificateStyleCsp(basePolicy: string) {
  const nonce = randomBytes(24).toString("base64");
  const directives = basePolicy.split(";").map((part) => part.trim()).filter(Boolean)
    .filter((part) => !/^style-src-(?:elem|attr)(?:\s|$)/.test(part));
  return {
    nonce,
    policy: [...directives, "style-src-attr 'unsafe-inline'", `style-src-elem 'nonce-${nonce}'`].join("; "),
  };
}
