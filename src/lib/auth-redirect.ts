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
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallbackPath;
  }
}
