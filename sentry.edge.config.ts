import * as Sentry from "@sentry/nextjs";

const tracesSampleRate = Number.parseFloat(
  process.env.SENTRY_TRACES_SAMPLE_RATE ||
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ||
    "0.05"
);
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

Sentry.init({
  dsn,
  tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.05,
  enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      surface: "edge",
      product: "warrantee",
    };
    return event;
  },
});
