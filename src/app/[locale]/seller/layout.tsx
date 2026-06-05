"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "../dashboard/layout";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const normalizedPath = pathname.replace(/^\/(en|ar)(?=\/|$)/, "") || "/";
  const isPublicRegistration =
    normalizedPath === "/seller/register" ||
    normalizedPath.startsWith("/seller/register/");

  if (isPublicRegistration) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
