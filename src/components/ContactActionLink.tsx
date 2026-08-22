"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackFunnelCtaClick } from "@/lib/ga4-events";

interface ContactActionLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "children"> {
  href: string;
  channel: "phone" | "whatsapp";
  locale: string;
  location: string;
  children: ReactNode;
}

export function ContactActionLink({
  href,
  channel,
  locale,
  location,
  children,
  ...anchorProps
}: ContactActionLinkProps) {
  return (
    <a
      {...anchorProps}
      href={href}
      onClick={() =>
        trackFunnelCtaClick(`contact_${channel}`, channel, {
          locale,
          location,
        })
      }
    >
      {children}
    </a>
  );
}
