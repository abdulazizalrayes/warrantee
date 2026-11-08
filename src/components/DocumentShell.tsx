import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";

const shouldRenderVercelInsights =
  process.env.VERCEL === "1" && Boolean(process.env.VERCEL_URL);

const arabicBrandFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-arabic-brand",
  display: "swap",
  // English pages share this shell but never use the Arabic family. Let the
  // browser fetch the font from CSS only when RTL content actually needs it.
  preload: false,
});



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
    <html lang={lang} dir={dir} className={arabicBrandFont.variable}>
      <body>
        <script defer src="/web-mcp.js" />
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
