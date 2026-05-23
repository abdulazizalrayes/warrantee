import * as Sentry from "@sentry/nextjs";

const tracesSampleRate = Number.parseFloat(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || "0.05"
);
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

function isClosedReactFlightStream(event: Sentry.ErrorEvent) {
  const exception = event.exception?.values?.[0];
  const message = exception?.value || event.message || "";
  if (message !== "Connection closed.") return false;

  const mechanism = exception?.mechanism?.type || "";
  const frames = exception?.stacktrace?.frames || [];
  return (
    mechanism === "auto.browser.global_handlers.onunhandledrejection" &&
    frames.some((frame) => frame.filename?.includes("/_next/static/chunks/"))
  );
}

Sentry.init({
  dsn,
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.05,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      surface: "browser",
      product: "warrantee",
    };
    if (isClosedReactFlightStream(event)) {
      return null;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
