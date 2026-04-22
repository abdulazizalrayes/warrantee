"use client";

import Link from "next/link";
import { ArrowRight, LogIn } from "lucide-react";
import { DashboardPageShell } from "@/components/dashboard/DashboardPageShell";

interface ProtectedRouteNoticeProps {
  locale: string;
  isRTL?: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  message: string;
  crumbs?: Array<{ label: string; href?: string }>;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export function ProtectedRouteNotice({
  locale,
  isRTL = false,
  eyebrow,
  title,
  subtitle,
  message,
  crumbs = [],
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
}: ProtectedRouteNoticeProps) {
  const defaultPrimaryLabel = isRTL ? "تسجيل الدخول" : "Sign in";
  const defaultSecondaryLabel = isRTL ? "العودة للرئيسية" : "Back to home";

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="space-y-8">
      <DashboardPageShell
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        crumbs={crumbs}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={primaryHref || `/${locale}/auth`}
              className="inline-flex items-center gap-2 rounded-full bg-[#1A1A2E] px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-[#2d2d5e]"
            >
              <LogIn className="h-4 w-4" />
              <span>{primaryLabel || defaultPrimaryLabel}</span>
            </Link>
            <Link
              href={secondaryHref || `/${locale}`}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[14px] font-medium text-[#1d1d1f] ring-1 ring-[#d2d2d7]/50 transition-colors hover:bg-[#f5f5f7]"
            >
              <span>{secondaryLabel || defaultSecondaryLabel}</span>
              <ArrowRight className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
            </Link>
          </div>
        }
      >
        <div className="rounded-[28px] border border-[#d2d2d7]/40 bg-white/90 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-10">
          <div className="mx-auto max-w-2xl text-center">
            <div className="inline-flex items-center rounded-full bg-[#f5f5f7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6e6e73]">
              {isRTL ? "وصول محمي" : "Protected access"}
            </div>
            <p className="mt-5 text-[16px] leading-7 text-[#3a3a3c] sm:text-[17px]">
              {message}
            </p>
          </div>
        </div>
      </DashboardPageShell>
    </div>
  );
}
