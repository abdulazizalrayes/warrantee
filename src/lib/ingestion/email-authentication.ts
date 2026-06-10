export type InboundEmailAuthentication = {
  aligned: boolean;
  method: "dkim" | "spf" | "dmarc" | "none";
  reason: string;
};

export function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>@\s]+@[^<>\s]+)>/);
  return (match?.[1] || value).trim();
}

export function getInboundEmailAuthentication(
  headers: Record<string, string>,
  fromEmail: string
): InboundEmailAuthentication {
  const domain = fromEmail.split("@")[1]?.toLowerCase();
  if (!domain) {
    return { aligned: false, method: "none", reason: "missing_from_domain" };
  }

  const normalizedHeaders = Object.fromEntries(
    Object.entries(headers || {}).map(([key, value]) => [
      key.toLowerCase(),
      String(value || "").toLowerCase(),
    ])
  );
  const authResults = [
    normalizedHeaders["authentication-results"],
    normalizedHeaders["arc-authentication-results"],
    normalizedHeaders["x-authentication-results"],
  ]
    .filter(Boolean)
    .join(" ");

  if (!authResults) {
    return { aligned: false, method: "none", reason: "missing_authentication_results" };
  }

  const mentionsDomain = authResults.includes(domain);
  if (authResults.includes("dmarc=pass") && mentionsDomain) {
    return { aligned: true, method: "dmarc", reason: "aligned_dmarc_pass" };
  }
  if (authResults.includes("dkim=pass") && mentionsDomain) {
    return { aligned: true, method: "dkim", reason: "aligned_dkim_pass" };
  }
  if (authResults.includes("spf=pass") && mentionsDomain) {
    return { aligned: true, method: "spf", reason: "aligned_spf_pass" };
  }

  return { aligned: false, method: "none", reason: "no_aligned_pass" };
}
