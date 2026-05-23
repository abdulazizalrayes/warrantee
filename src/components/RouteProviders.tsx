"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AuthProvider = dynamic(() =>
  import("@/lib/auth-context").then((mod) => mod.AuthProvider)
);

const AUTH_ROUTE_PREFIXES = [
  "/admin",
  "/analytics",
  "/approval",
  "/auth",
  "/billing",
  "/claims",
  "/dashboard",
  "/documents",
  "/extensions",
  "/forgot-password",
  "/login",
  "/notifications",
  "/onboarding",
  "/pricing",
  "/reports",
  "/reset-password",
  "/seller",
  "/settings",
  "/signup",
  "/warranties",
];

function stripLocale(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "en" || parts[0] === "ar") {
    return `/${parts.slice(1).join("/")}`;
  }
  return pathname || "/";
}

function needsAuthProvider(pathname: string | null) {
  const path = stripLocale(pathname || "/");
  return AUTH_ROUTE_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
}

export default function RouteProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!needsAuthProvider(usePathname())) {
    return <>{children}</>;
  }

  return <AuthProvider>{children}</AuthProvider>;
}
