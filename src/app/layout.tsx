import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://warrantee.io"),
};

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
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
