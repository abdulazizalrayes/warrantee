"use client";

import { useEffect } from "react";
import { trackPageView } from "@/lib/ga4-events";

interface PageViewTrackerProps {
  pageName: string;
  pageType: string;
  locale?: string;
  extra?: Record<string, unknown>;
}

export function PageViewTracker({
  pageName,
  pageType,
  locale,
  extra,
}: PageViewTrackerProps) {
  const extraKey = JSON.stringify(extra || {});

  useEffect(() => {
    let parsedExtra: Record<string, unknown> = {};

    try {
      parsedExtra = extraKey ? (JSON.parse(extraKey) as Record<string, unknown>) : {};
    } catch {
      parsedExtra = {};
    }

    trackPageView(pageName, {
      page_type: pageType,
      locale,
      ...parsedExtra,
    });
  }, [extraKey, locale, pageName, pageType]);

  return null;
}
