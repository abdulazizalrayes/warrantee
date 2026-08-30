export function isTrustedSameOriginRequest(request: Request, fallbackOrigin = "https://warrantee.io") {
  const allowedOrigins = new Set<string>();

  const addLoopbackAliases = (url: URL) => {
    if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname)) return;

    const port = url.port ? `:${url.port}` : "";
    allowedOrigins.add(`http://localhost${port}`);
    allowedOrigins.add(`http://127.0.0.1${port}`);
    allowedOrigins.add(`http://[::1]${port}`);
  };

  try {
    allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin).origin);
  } catch {
    allowedOrigins.add(fallbackOrigin);
  }
  allowedOrigins.add(fallbackOrigin);

  try {
    addLoopbackAliases(new URL(fallbackOrigin));
    addLoopbackAliases(new URL(request.url));
  } catch {
    // Keep production safety strict when URLs cannot be parsed.
  }

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
