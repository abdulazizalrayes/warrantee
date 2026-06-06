import type { Metadata } from "next";
import { DocumentShell } from "@/components/DocumentShell";
import "@/app/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://warrantee.io"),
};

export default function RootRedirectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DocumentShell>{children}</DocumentShell>;
}
