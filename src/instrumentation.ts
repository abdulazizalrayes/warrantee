type CaptureRequestErrorArgs = Parameters<
  typeof import("@sentry/nextjs").captureRequestError
>;

const disableSentryInstrumentation =
  process.env.WARRANTEE_DISABLE_SENTRY_NEXT_CONFIG === "1" &&
  process.env.VERCEL_ENV !== "production";

export async function register() {
  if (disableSentryInstrumentation) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(...args: CaptureRequestErrorArgs) {
  if (disableSentryInstrumentation) return;

  const Sentry = await import("@sentry/nextjs");
  return Sentry.captureRequestError(...args);
}
