"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackFunnelCtaClick } from "@/lib/ga4-events";

interface TrackedLinkProps {
  href: string;
  cta: string;
  locale?: string;
  location?: string;
  className?: string;
  children: ReactNode;
}

export function TrackedLink({
  href,
  cta,
  locale,
  location,
  className,
  children,
}: TrackedLinkProps) {
  const onClick = () => {
    trackFunnelCtaClick(cta, href, {
      locale,
      location,
    });
  };

  if (href.startsWith("#")) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
