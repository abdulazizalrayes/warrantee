"use client";

import Link from "next/link";
import { ChevronRight, CircleAlert, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

interface Crumb {
  label: string;
  href?: string;
}

interface Stat {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger";
}

interface DashboardPageShellProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  stats?: Stat[];
  auditNote?: string;
  children: ReactNode;
}

const toneClasses: Record<NonNullable<Stat["tone"]>, string> = {
  default: "bg-white/80 text-[#1d1d1f] ring-[#d2d2d7]/50",
  success: "bg-[#eefbf2] text-[#14532d] ring-[#bbf7d0]",
  warning: "bg-[#fff8e8] text-[#92400e] ring-[#fde68a]",
  danger: "bg-[#fff1f2] text-[#9f1239] ring-[#fecdd3]",
};

export function DashboardPageShell({
  eyebrow,
  title,
  subtitle,
  crumbs = [],
  actions,
  stats = [],
  auditNote,
  children,
}: DashboardPageShellProps) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-white/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.95),_rgba(247,247,250,0.92)_45%,_rgba(241,245,249,0.95))] p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),transparent_45%)]" />
        <div className="relative space-y-5">
          {crumbs.length > 0 ? (
            <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#86868b]">
              {crumbs.map((crumb, index) => (
                <div key={`${crumb.label}-${index}`} className="flex items-center gap-2">
                  {crumb.href ? (
                    <Link href={crumb.href} className="hover:text-[#1A1A2E] transition-colors">
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[#1A1A2E]">{crumb.label}</span>
                  )}
                  {index < crumbs.length - 1 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                </div>
              ))}
            </nav>
          ) : null}

          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              {eyebrow ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-[#1A1A2E]/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#1A1A2E]">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{eyebrow}</span>
                </div>
              ) : null}
              <div>
                <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-[#1d1d1f] sm:text-[42px]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[#6e6e73] sm:text-[16px]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
          </div>

          {stats.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`rounded-2xl px-4 py-4 ring-1 backdrop-blur ${toneClasses[stat.tone || "default"]}`}
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                    {stat.label}
                  </div>
                  <div className="mt-2 text-[24px] font-semibold tracking-[-0.02em]">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {auditNote ? (
            <div className="flex items-start gap-3 rounded-2xl border border-[#c7ddff] bg-[#f2f7ff] px-4 py-4 text-sm text-[#194185]">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-6">{auditNote}</p>
            </div>
          ) : null}
        </div>
      </section>

      {children}
    </div>
  );
}
