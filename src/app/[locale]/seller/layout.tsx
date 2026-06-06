"use client";

import { usePathname } from "next/navigation";
import DashboardLayout from "../dashboard/layout";
import { LOCALE_PREFIX_PATTERN } from "@/lib/i18n";

export default function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const normalizedPath = pathname.replace(new RegExp(`^/(${LOCALE_PREFIX_PATTERN})(?=/|$)`), "") || "/";
  const isPublicRegistration =
    normalizedPath === "/seller/register" ||
    normalizedPath.startsWith("/seller/register/");

  if (isPublicRegistration) {
    return <>{children}</>;
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
