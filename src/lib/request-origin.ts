export function isTrustedSameOriginRequest(request: Request, fallbackOrigin = "https://warrantee.io") {
  const allowedOrigins = new Set<string>();

  try {
    allowedOrigins.add(new URL(process.env.NEXT_PUBLIC_APP_URL || fallbackOrigin).origin);
  } catch {
    allowedOrigins.add(fallbackOrigin);
  }
  allowedOrigins.add(fallbackOrigin);

  if (process.env.VERCEL_ENV !== "production") {
    try {
      const fallbackUrl = new URL(fallbackOrigin);
      if (["localhost", "127.0.0.1", "::1"].includes(fallbackUrl.hostname)) {
        const port = fallbackUrl.port ? `:${fallbackUrl.port}` : "";
        allowedOrigins.add(`http://localhost${port}`);
        allowedOrigins.add(`http://127.0.0.1${port}`);
        allowedOrigins.add(`http://[::1]${port}`);
      }
    } catch {
      // Keep production safety strict; local loopback aliases are only a dev/test convenience.
    }
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
