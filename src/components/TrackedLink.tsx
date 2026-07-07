"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { appendCampaignParams, trackFunnelCtaClick } from "@/lib/ga4-events";

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
  const [attributedHref, setAttributedHref] = useState(href);

  useEffect(() => {
    setAttributedHref(appendCampaignParams(href));
  }, [href]);

  const onClick = () => {
    trackFunnelCtaClick(cta, attributedHref, {
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
    <Link href={attributedHref} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
