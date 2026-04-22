"use client";

import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { PageBackButton } from "@/components/PageBackButton";

interface SubpageHeroHeaderProps {
  fallbackHref: string;
  isRTL?: boolean;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  children?: ReactNode;
}

export function SubpageHeroHeader({
  fallbackHref,
  isRTL = false,
  eyebrow,
  title,
  subtitle,
  badge,
  children,
}: SubpageHeroHeaderProps) {
  return (
    <section className="mb-6 rounded-3xl bg-gradient-to-br from-[#1A1A2E] via-[#242446] to-[#2f2f5f] px-6 py-7 text-white shadow-lg">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <PageBackButton
            fallbackHref={fallbackHref}
            isRTL={isRTL}
            className="mt-1 shrink-0 bg-white/10 text-white hover:bg-white/20"
          />
          <div className="max-w-2xl">
            {eyebrow ? (
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/85">
                <Sparkles size={14} />
                {eyebrow}
              </div>
            ) : null}
            <h1 className="mt-4 text-[30px] font-semibold tracking-tight">{title}</h1>
            {subtitle ? (
              <p className="mt-3 max-w-xl text-[15px] text-white/70">{subtitle}</p>
            ) : null}
          </div>
        </div>

        {badge || children ? (
          <div className="flex flex-col gap-3 lg:items-end">
            {badge ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-white/75">
                {badge}
              </div>
            ) : null}
            {children}
          </div>
        ) : null}
      </div>
    </section>
  );
}
