export function resolveSafeAuthRedirect(
  requestedPath: string | null,
  fallbackPath: string,
) {
  if (!requestedPath?.startsWith("/") || requestedPath.includes("\\")) {
    return fallbackPath;
  }

  try {
    const sentinelOrigin = "https://warrantee.invalid";
    const resolved = new URL(requestedPath, sentinelOrigin);
    if (resolved.origin !== sentinelOrigin) return fallbackPath;
    const destination = `${resolved.pathname}${resolved.search}${resolved.hash}`;
    // Dot-segment normalization can create a protocol-relative path. Validate
    // the exact string callers will resolve again, not only the first URL.
    if (new URL(destination, sentinelOrigin).origin !== sentinelOrigin) return fallbackPath;
    return destination;
  } catch {
    return fallbackPath;
  }
}
