import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  metadataBase: new URL("https://warrantee.io"),
};

const shouldRenderVercelInsights = process.env.VERCEL === "1" && Boolean(process.env.VERCEL_URL);

const webMcpScript = `
(() => {
  if (typeof window === "undefined") return;
  const modelContext = window.navigator && window.navigator.modelContext;
  if (!modelContext || typeof modelContext.provideContext !== "function") return;

  const absolute = (path) => new URL(path, window.location.origin).toString();
  const currentLocale = () => {
    const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
    return firstSegment === "ar" ? "ar" : "en";
  };
  const localized = (path) => absolute("/" + currentLocale() + path);

  modelContext.provideContext({
    tools: [
      {
        name: "open-warranty-verification",
        title: "Open Warranty Verification",
        description: "Open the public warranty verification page for a provided reference.",
        inputSchema: {
          type: "object",
          properties: {
            reference: {
              type: "string",
              description: "Warranty reference or verification identifier."
            }
          },
          required: ["reference"]
        },
        annotations: { readOnlyHint: true },
        execute: ({ reference }) => {
          const url = localized("/verify?query=" + encodeURIComponent(reference));
          window.location.assign(url);
          return {
            content: [
              { type: "text", text: "Opened warranty verification for " + reference + "." }
            ]
          };
        }
      },
      {
        name: "open-claims-intake",
        title: "Open Claims Intake",
        description: "Open the warranty claims page so the user can submit a claim.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        annotations: { readOnlyHint: false },
        execute: () => {
          const url = localized("/claims");
          window.location.assign(url);
          return {
            content: [
              { type: "text", text: "Opened the claims intake workflow." }
            ]
          };
        }
      },
      {
        name: "open-seller-onboarding",
        title: "Open Seller Onboarding",
        description: "Open the seller onboarding page for business account setup.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        },
        annotations: { readOnlyHint: true },
        execute: () => {
          const url = localized("/seller/register");
          window.location.assign(url);
          return {
            content: [
              { type: "text", text: "Opened the seller onboarding flow." }
            ]
          };
        }
      }
    ]
  });
})();
`;

/**
 * Root layout owns <html> and <body>.
 *
 * Required in Next.js 15 App Router. Without explicit <html>/<body> the build
 * falls through to the Pages Router _error/_document mechanism when generating
 * static 404/500 pages, which throws:
 *   "<Html> should not be imported outside of pages/_document"
 *
 * The [locale] layout injects a synchronous inline <script> to set lang and dir
 * attributes on <html> before React hydrates, so RTL locales render correctly
 * without a flash of wrong direction.
 *
 * suppressHydrationWarning is required on <html> and <body> because the locale
 * layout will mutate their attributes server-side via the inline script, causing
 * an expected mismatch that React should ignore.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: webMcpScript }} />
        {children}
        {shouldRenderVercelInsights ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  );
}
