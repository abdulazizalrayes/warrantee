import type { Metadata } from "next";

const BASE_URL = "https://warrantee.io";

type PageKey =
  | "home"
  | "about"
  | "features"
  | "pricing"
  | "contact"
  | "faq"
  | "guide"
  | "verify"
  | "auth"
  | "terms"
  | "privacy"
  | "cookies";

const PAGE_PATHS: Record<PageKey, string> = {
  home: "",
  about: "/about",
  features: "/features",
  pricing: "/pricing",
  contact: "/contact",
  faq: "/faq",
  guide: "/guide",
  verify: "/verify",
  auth: "/auth",
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
};

const PAGE_META: Record<
  PageKey,
  { en: { title: string; description: string }; ar: { title: string; description: string } }
> = {
  home: {
    en: {
      title: "Warrantee â Warranty Management Platform",
      description:
        "Track, approve, and claim warranties in one place. Bilingual Arabic & English. Free to start.",
    },
    ar: {
      title: "ÙØ§Ø±ÙØªÙ â ÙÙØµØ© Ø¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª",
      description:
        "ØªØªØ¨Ø¹ Ø¶ÙØ§ÙØ§ØªÙ ÙØ¥Ø¯Ø§Ø±ØªÙØ§ ÙØ§ÙÙØ·Ø§ÙØ¨Ø© Ø¨ÙØ§ ÙÙ ÙÙØ§Ù ÙØ§Ø­Ø¯. Ø¨Ø§ÙÙØ¹ØªÙÙ Ø§ÙØ¹Ø±Ø¨ÙØ© ÙØ§ÙØ¥ÙØ¬ÙÙØ²ÙØ©. Ø§Ø¨Ø¯Ø£ ÙØ¬Ø§ÙØ§Ù.",
    },
  },
  about: {
    en: {
      title: "About Warrantee â Our Story",
      description:
        "Learn how Warrantee is transforming warranty management for businesses across Saudi Arabia and the GCC.",
    },
    ar: {
      title: "Ù¹Ù ÙØ§Ø±ÙØªÙ â ÙØµØªÙØ§",
      description:
        "ØªØ¹Ø±Ù Ø¹ÙÙ ÙÙÙÙØ© ØªØ­ÙÙÙ ÙØ§Ø±ÙØªÙ ÙØ¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Öª ÙÙØ´Ø±ÙØ§Öª ÙÙ Ø§ÙÙÙÙÙØ© Ø§ÙØ¹Ø±Ø¨ÙØ© Ø§ÙØ³Ø¹ÙØ¯ÙØ© ÙØ¯ÙÙ Ø§ÙØ®ÙÙØ¬.",
    },
  },
  features: {
    en: {
      title: "Warrantee Features â Smart Warranty Tools",
      description:
        "Explore Warrantee's approval workflow, expiry reminders, bilingual certificates, and real-time dashboard.",
    },
    ar: {
      title: "ÙÙØ²Ø§Öª ÙØ§Ø±ÙØªÙ â Ø£Ø¯ÙØ§Øª Ø§ÙØ¶ÙØ§ÙØ§Öª Ø§ÙØ°ÙÙØ©",
      description:
        "Ø§Ø³ØªÙØ´Ù Ø³ÙØ± Ø¹ÙÙ Ø§ÙÙÙØ§ÙÙØ© ÙØªØ°ÙÙØ±Ø§Ù Ø§ÙØ§ÙØªÙØ§Ø¡ ÙØ§ÙØ´ÙØ§Ø¯Ø§Ù Ø«ÙØ§Ø¦ÙØ© Ø§ÙÙØºØ© ÙÙÙØ­Ø© Ø§ÙÙØ¹ÙÙØ§Öª ÙÙ ÙØ§Ø±ÙØªÙ.",
    },
  },
  pricing: {
    en: {
      title: "Warrantee Pricing â Simple & Transparent Plans",
      description:
        "Start free, scale as you grow. See Warrantee's pricing plans for individuals and businesses.",
    },
    ar: {
      title: "Ø£Ø³Ø¹Ø§Ø± ÙØ§Ø±ÙØªÙ" Ø®Ø·Ø· Ø¨Ø³ÙØ·Ø© ÙÙØºØ§Ø§Öª",
      description:
        "Ø©Ø¨Ø¯Ø£ ÙØ¬Ø§ÙØ§Ù ÙØªÙØ³Ø¹ ÙØ¹ ÙÙÙ Ø¹ÙÙÙ. Ø§Ø·ÙØ¹ Ø¹ÙÙ Ø®Ø·Ø· Ø£Ø³Ø¹Ø§Ø± ÙØ§Ø±ÙØªÙ ÙÙØ£ÙØ±Ø§Ø¯ ÙØ§ÙØ´Ø±ÙØ§Øª.",
    },
  },
  contact: {
    en: {
      title: "Contact Warrantee â Get in Touch",
      description:
        "Reach the Warrantee team for support, partnerships, or enterprise inquiries.",
    },
    ar: {
      title: "ØªÙØ§ØµÙ ÙØ¹ ÙØ§Ø±ÙØªÙ",
      description:
        "ØªÙØ§ØµÙ ÙØ¹ ÙØµÙÙ ÙØ§Ø±ÙØªÙ ÙÙØ­ØµÙÙ Ø¹ÙÙ Ø§ÙØ¯Ø¸Ù Ø£Ù Ø§ÙØ´Ø±Ø§ÙØ§Øª Ø£Ù Ø§Ø³ØªÙØ³Ø§Ø±Ø§Øª Ø§ÙØ´Ø±ÙØ§Øª.",
    },
  },
  faq: {
    en: {
      title: "FAQ â Warrantee Frequently Asked Questions",
      description:
        "Find answers to common questions about Warrantee's warranty management platform.",
    },
    ar: {
      title: "Ø§ÙØ£Ø³Ø¦ÙØ© Ø§ÙØ´Ø§Ø¦Ø¹Ø© â ÙØ§Ø±ÙØªÙ",
      description:
        "Ø©Ø¹Ø«Ø± Ø¹ÙÙ Ø¥Ø¬Ø§Ø¨Ø§Øª ÙÙØ£Ø³Ø¦ÙØ© Ø§ÙØ´Ø§Ø¦Ø¹Ø© Ø­ÙÙ ÙÙØµØ© ÙØ§Ø±ÙØªÙ ÙØ¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª.",
    },
  },
  guide: {
    en: {
      title: "Warrantee User Guide â Getting Started",
      description:
        "Step-by-step guide to using Warrantee: set up your account, create warranties, and manage approvals.",
    },
    ar: {
      title: "Ø¯ÙÙÙ ÙØ³ØªØ®Ø¯Ù ÙØ§Ø±ÙØªÙ â Ø§ÙØ¨Ø¯Ø¡",
      description:
        "Ø¯ÙÙÙ Ø®Ø·ÙØ© Ø¨Ø®Ø·ÙØ© ÙØ§Ø³ØªØ®Ø¯Ø§ÙÙ ÙØ§Ø±ÙØªÙ: Ø¥Ø¹Ø¯Ø§Ø¯ Ø­Ø³Ø§Ø¨Ù ÙØ¥ÙØ¬Ø§Ø¡ Ø§ÙØ¶ÙØ§ÙØ§Öª ÙØ¥Ø¯Ø§Ø±Ø© Ø§ÙÙÙØ§ÙÙØ©Ø¯.",
    },
  },
  verify: {
    en: {
      title: "Verify a Warranty - Warrantee",
      description:
        "Enter a warranty reference number to verify its authenticity instantly on Warrantee.",
    },
    ar: {
      title: "ØªØ­ÙÙ ÙÙ Ø§ÙØ¶ÙØ§Ù â ÙØ§Ø±ÙØªÙ",
      description: "Ø£Ø¯Ø®Ù Ø±ÙÙ ÙØ´Ø¹ Ø§ÙØ¶ÙØ§Ù ÙÙØªØ­ÙÙ ÙÙ ØµØ­ØªÙ ÙÙØ±Ø§Ù Ø¹ÙÙ ÙÙØµØ© ÙØ§Ø±ÙØªÙ.",
    },
  },
  auth: {
    en: {
      title: "Sign In to Warrantee",
      description:
        "Log in or create a free Warrantee account to start managing your warranties today.",
    },
    ar: {
      title: "ØªØ³Ø¬ÙÙ Ø§ÙØ¯Ø®ÙÙ Ø¥ÙÙ ÙØ§Ø±ÙØªÙ",
      description:
        "Ø³Ø¬ÙÙ Ø¯Ø®ÙÙÙ Ø£Ù Ø£ÙØ´Ø¦ Ø­Ø³Ø§Ø¨Ø§Ù ÙØ¬Ø§ÙÙØ§Ù ÙÙ ÙØ§Ø±ÙØªÙ ÙØ¨Ø¯Ø¡ Ø¥Ø¯Ø§Ø±Ø© Ø¶ÙØ§ÙØ§ØªÙ Ø§ÙÙÙÙ.",
    },
  },
  terms: {
    en: {
      title: "Terms of Service â Warrantee",
      description:
        "Read Warrantee's terms of service governing the use of our warranty management platform.",
    },
    ar: {
      title: "Ø´Ø±ÙØ· Ø§ÙØ®Ø¯ÙØ© â ÙØ§Ø±ÙØªÙ",
      description:
        "Ø§ÙØ±Ø£ Ø´Ø±ÙØ· Ø®Ø¯ÙØ© ÙØ§Ø±ÙØªÙ Ø§ÙØªÙ ØªØ­ÙÙ Ø§Ø³ØªØ®Ø¯Ø§Ù ÙÙØµØ© Ø¥Ø¯Ø§Ø±Ø© Ø§ÙØ¶ÙØ§ÙØ§Øª.",
    },
  },
  privacy: {
    en: {
      title: "Privacy Policy â Warrantee",
      description:
        "Learn how Warrantee collects, uses, and protects your personal data and privacy.",
    },
    ar: {
      title: "Ø³ÙØ§Ø³Ø© Ø§ÙØ®ØµÙØµÙØ© â ÙØ§Ø±ÙØªÙ",
      description:
        "ØªØ¹Ø±Ù Ø¹ÙÙ ÙÙÙÙÙØ© Ø¬ÙØ¹ ÙØ§Ø±ÙØªÙ ÙØ¨ÙØ§ÙØ§ØªÙ Ø§ÙØ´Ø®Ø­ÙØ© ÙØ§Ø³ØªØ®Ø¯Ø§ÙÙØ§ ÙØ­ÙØ§ÙØªÙØ§.",
    },
  },
  cookies: {
    en: {
      title: "Cookie Policy â Warrantee",
      description:
        "Understand how Warrantee uses cookies and similar tracking technologies on our platform.",
    },
    ar: {
      title: "Ø³ÙØ§Ø³Ø© ÙÙÙØ§Øª ØªØ¹Ø±ÙÙ Ø§ÙØ§Ø±ØªØ¨Ø§Ø· â ÙØ§Ø±ÙØªÙ",
      description:
        "ÙÙÙ ÙÙÙÙØ© Ø§Ø³ØªØ®Ø¯Ø§Ù ÙØ§Ø±ÙØªÙ ÙÙÙÙØ§Øª ØªØ²Ø±ÙÙ Ø§ÙØ§Ø±ØªØ¨Ø§Ø· ÙØªÙÙÙÙØ§Øª Ø§ÙØªØªØ¨Ø¹ Ø§ÙÙÙØ§Ø«ÙØ©.",
    },
  },
};

export function buildPageMetadata(
  page: PageKey,
  locale: string
): Metadata {
  const isAr = locale === "ar";
  const lang = isAr ? "ar" : "en";
  const meta = PAGE_META[page][lang];
  const pagePath = PAGE_PATHS[page];

  return {
    title: meta.title,
    description: meta.description,
    alternates: {
      canonical: `${BASE_URL}/${locale}${pagePath}`,
      languages: {
        en: `${BASE_URL}/en${pagePath}`,
        ar: `${BASE_URL}/ar${pagePath}`,
        "x-default": `${BASE_URL}/en${pagePath}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${locale}${pagePath}`,
      locale: isAr ? "ar_SA" : "en_US",
    },
    twitter: {
      title: meta.title,
      description: meta.description,
    },
  };
}
