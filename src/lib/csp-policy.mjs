import { trustedStyleHashes } from "./csp-styles.mjs";
import { isolatedSupabaseOrigin } from "./isolated-test-origin.mjs";

const isolatedDataOrigin = isolatedSupabaseOrigin();
const isolatedConnectionSources = isolatedDataOrigin ? ` ${isolatedDataOrigin} ${isolatedDataOrigin.replace("http:", "ws:")}` : "";

const scriptSources = [
  "'self'",
  ...(process.env.NODE_ENV === "development" ? ["'unsafe-inline'"] : []),
  ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://js.stripe.com",
  "https://checkout.stripe.com",
  "https://vercel.live",
  "https://static.cloudflareinsights.com",
].join(" ");

export const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  `script-src ${scriptSources}`,
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  "style-src-attr 'unsafe-inline'",
  `style-src-elem 'self' ${process.env.NODE_ENV === "development" ? "'unsafe-inline'" : trustedStyleHashes.join(" ")}`,
  `img-src 'self' data: blob: https://erptubrslnfmkuouczgn.supabase.co https://lh3.googleusercontent.com https://www.google-analytics.com https://www.googletagmanager.com${isolatedDataOrigin ? ` ${isolatedDataOrigin}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' https://erptubrslnfmkuouczgn.supabase.co wss://erptubrslnfmkuouczgn.supabase.co https://api.stripe.com https://checkout.stripe.com https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://vitals.vercel-insights.com https://*.sentry.io https://*.ingest.sentry.io https://static.cloudflareinsights.com https://cloudflareinsights.com${isolatedConnectionSources}`,
  "frame-src https://js.stripe.com https://checkout.stripe.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");
