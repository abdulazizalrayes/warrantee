export function isTrustedSameOriginRequest(request: Request, fallbackOrigin = "https://warrantee.io") {
  const allowedOrigins = new Set<string>();

  try {
    allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin).origin);
  } catch {
    allowedOrigins.add(fallbackOrigin);
  }
  allowedOrigins.add(fallbackOrigin);

  const origin = request.headers.get("origin");
  if (origin) return allowedOrigins.has(origin);

  const referer = request.headers.get("referer");
  if (!referer) return false;

  try {
    return allowedOrigins.has(new URL(referer).origin);
  } catch {
    return false;
  }
}
