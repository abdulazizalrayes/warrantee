import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { LOCALES } from "@/lib/i18n";

const shouldRenderVercelInsights =
  process.env.VERCEL === "1" && Boolean(process.env.VERCEL_URL);

const webMcpScript = `
(() => {
  if (typeof window === "undefined") return;
  const modelContext = window.navigator && window.navigator.modelContext;
  if (!modelContext || typeof modelContext.provideContext !== "function") return;

  const supportedLocales = ${JSON.stringify(LOCALES)};
  const absolute = (path) => new URL(path, window.location.origin).toString();
  const currentLocale = () => {
    const firstSegment = window.location.pathname.split("/").filter(Boolean)[0];
    return supportedLocales.includes(firstSegment) ? firstSegment : "en";
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

export function DocumentShell({
  children,
  dir = "ltr",
  lang = "en",
}: {
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
  lang?: string;
}) {
  return (
    <html lang={lang} dir={dir}>
      <body>
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
