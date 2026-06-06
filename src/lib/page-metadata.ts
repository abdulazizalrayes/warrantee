import type { Metadata } from "next";
import {
  getContentLocale,
  isIndexedLocale,
  type IndexedLocale,
} from "@/lib/locales";

const BASE_URL = "https://warrantee.io";
const OG_IMAGE = `${BASE_URL}/opengraph-image`;

type PageKey =
  | "home"
  | "about"
  | "blog"
  | "features"
  | "pricing"
  | "contact"
  | "faq"
  | "guide"
  | "verify"
  | "apiDocs"
  | "support"
  | "auth"
  | "terms"
  | "privacy"
  | "cookies";

const PAGE_PATHS: Record<PageKey, string> = {
  home: "",
  about: "/about",
  blog: "/blog",
  features: "/features",
  pricing: "/pricing",
  contact: "/contact",
  faq: "/faq",
  guide: "/guide",
  verify: "/verify",
  apiDocs: "/api-docs",
  support: "/support",
  auth: "/auth",
  terms: "/terms",
  privacy: "/privacy",
  cookies: "/cookies",
};

const PAGE_META: Record<
  PageKey,
  {
    [locale in IndexedLocale]: { title: string; description: string };
  }
> = {
  home: {
    en: {
      title: "Warrantee.io — Warranty Management Software & Platform",
      description:
        "Warrantee.io is warranty management software to track, approve, extend, verify, and claim warranties in one place. Bilingual Arabic and English. Free plan available.",
    },
    ar: {
      title: "وارنتي — منصة إدارة الضمانات | ثق بالشروط™",
      description:
        "منصة إدارة الضمانات لتتبّع الضمانات والموافقة عليها وتمديدها وتقديم المطالبات من مكان واحد. باللغتين العربية والإنجليزية. خطة مجانية متاحة.",
    },
  },
  about: {
    en: {
      title: "About Warrantee — Our Story",
      description:
        "Learn how Warrantee is transforming warranty management for businesses across Saudi Arabia and the GCC.",
    },
    ar: {
      title: "عن وارنتي — قصتنا",
      description:
        "تعرّف على كيف تغيّر وارنتي إدارة الضمانات للشركات في المملكة العربية السعودية ودول الخليج.",
    },
  },
  blog: {
    en: {
      title: "Warrantee Blog — Warranty Management Guides",
      description:
        "Practical guides on warranty management software, warranty tracking, claims workflows, extensions, and bilingual warranty operations.",
    },
    ar: {
      title: "مدونة وارنتي — أدلة إدارة الضمانات",
      description:
        "أدلة عملية حول برامج إدارة الضمانات وتتبع الضمانات والمطالبات والتمديدات وتشغيل الضمانات باللغتين العربية والإنجليزية.",
    },
  },
  features: {
    en: {
      title: "Warrantee Features — Smart Warranty Tools",
      description:
        "Explore Warrantee's approval workflow, expiry reminders, bilingual certificates, and real-time dashboard.",
    },
    ar: {
      title: "مزايا وارنتي — أدوات ذكية لإدارة الضمان",
      description:
        "استكشف سير عمل الموافقات وتذكيرات انتهاء الضمان والشهادات الثنائية اللغة ولوحة المتابعة الفورية في وارنتي.",
    },
  },
  pricing: {
    en: {
      title: "Warrantee Pricing — Simple and Transparent Plans",
      description:
        "Start with a Free plan, no credit card required, or upgrade to the Professional launch offer at $1/month with the first month free. Enterprise warranty management pricing is custom.",
    },
    ar: {
      title: "أسعار وارنتي — خطط بسيطة وواضحة",
      description:
        "ابدأ بالخطة المجانية دون بطاقة ائتمانية، أو انتقل إلى عرض الإطلاق للخطة الاحترافية مقابل دولار واحد شهريًا مع الشهر الأول مجانًا. أسعار المؤسسات مخصصة.",
    },
  },
  contact: {
    en: {
      title: "Contact Warrantee — Get in Touch",
      description:
        "Reach the Warrantee team for support, partnerships, or enterprise inquiries.",
    },
    ar: {
      title: "تواصل مع وارنتي",
      description:
        "تواصل مع فريق وارنتي للدعم أو الشراكات أو استفسارات الشركات.",
    },
  },
  faq: {
    en: {
      title: "FAQ — Warrantee Frequently Asked Questions",
      description:
        "Find answers to common questions about Warrantee's warranty management platform.",
    },
    ar: {
      title: "الأسئلة الشائعة — وارنتي",
      description:
        "اعثر على إجابات للأسئلة الشائعة حول منصة وارنتي لإدارة الضمانات.",
    },
  },
  guide: {
    en: {
      title: "Warrantee User Guide — Getting Started",
      description:
        "Step-by-step guide to using Warrantee: set up your account, create warranties, and manage approvals.",
    },
    ar: {
      title: "دليل استخدام وارنتي — البداية",
      description:
        "دليل خطوة بخطوة لاستخدام وارنتي: أنشئ حسابك وابدأ الضمانات وأدِر الموافقات بسهولة.",
    },
  },
  verify: {
    en: {
      title: "Verify a Warranty — Warrantee",
      description:
        "Enter a warranty reference number to verify its authenticity instantly on Warrantee.",
    },
    ar: {
      title: "تحقق من الضمان — وارنتي",
      description:
        "أدخل رقم مرجع الضمان للتحقق من صحته فورًا عبر منصة وارنتي.",
    },
  },
  apiDocs: {
    en: {
      title: "Warrantee API Documentation — ERP & System Integrations",
      description:
        "Integrate Warrantee with ERP, ecommerce, and internal systems using warranty management APIs and server-to-server integration tokens.",
    },
    ar: {
      title: "وثائق API وارنتي — تكاملات ERP والأنظمة",
      description:
        "ادمج وارنتي مع أنظمة ERP والمتاجر والأنظمة الداخلية باستخدام واجهات إدارة الضمانات ورموز التكامل الخادمية.",
    },
  },
  support: {
    en: {
      title: "Warrantee Support — Help and Contact Options",
      description:
        "Get support for Warrantee accounts, warranties, claims, seller onboarding, and API integrations.",
    },
    ar: {
      title: "دعم وارنتي — المساعدة وخيارات التواصل",
      description:
        "احصل على دعم لحسابات وارنتي والضمانات والمطالبات وانضمام البائعين وتكاملات API.",
    },
  },
  auth: {
    en: {
      title: "Sign In to Warrantee",
      description:
        "Log in or create a free Warrantee account to start managing your warranties today.",
    },
    ar: {
      title: "تسجيل الدخول إلى وارنتي",
      description:
        "سجّل دخولك أو أنشئ حسابًا مجانيًا في وارنتي لبدء إدارة ضماناتك اليوم.",
    },
  },
  terms: {
    en: {
      title: "Terms of Service — Warrantee",
      description:
        "Read Warrantee's terms of service governing the use of our warranty management platform.",
    },
    ar: {
      title: "شروط الخدمة — وارنتي",
      description:
        "اقرأ شروط خدمة وارنتي التي تنظّم استخدام منصة إدارة الضمانات.",
    },
  },
  privacy: {
    en: {
      title: "Privacy Policy — Warrantee",
      description:
        "Learn how Warrantee collects, uses, and protects your personal data and privacy.",
    },
    ar: {
      title: "سياسة الخصوصية — وارنتي",
      description:
        "تعرّف على كيفية جمع وارنتي لبياناتك الشخصية واستخدامها وحمايتها.",
    },
  },
  cookies: {
    en: {
      title: "Cookie Policy — Warrantee",
      description:
        "Understand how Warrantee uses cookies and similar tracking technologies on our platform.",
    },
    ar: {
      title: "سياسة ملفات تعريف الارتباط — وارنتي",
      description:
        "افهم كيف تستخدم وارنتي ملفات تعريف الارتباط وتقنيات التتبع المشابهة على منصتها.",
    },
  },
};

const NOINDEX_PAGES = new Set<PageKey>(["auth"]);

export function buildPageMetadata(page: PageKey, locale: string): Metadata {
  const contentLocale = getContentLocale(locale);
  const isAr = contentLocale === "ar";
  const meta = PAGE_META[page][contentLocale];
  const pagePath = PAGE_PATHS[page];
  const isIndexed = isIndexedLocale(locale);
  const shouldNoindex = NOINDEX_PAGES.has(page) || !isIndexed;
  const canonicalLocale = isIndexed ? locale : "en";

  return {
    title: meta.title,
    description: meta.description,
    robots: shouldNoindex
      ? {
          index: false,
          follow: true,
          googleBot: {
            index: false,
            follow: true,
          },
        }
      : undefined,
    metadataBase: new URL(BASE_URL),
    alternates: {
      canonical: `${BASE_URL}/${canonicalLocale}${pagePath}`,
      languages: {
        en: `${BASE_URL}/en${pagePath}`,
        "en-US": `${BASE_URL}/en${pagePath}`,
        ar: `${BASE_URL}/ar${pagePath}`,
        "ar-SA": `${BASE_URL}/ar${pagePath}`,
        "x-default": `${BASE_URL}/en${pagePath}`,
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${BASE_URL}/${canonicalLocale}${pagePath}`,
      siteName: "Warrantee.io",
      type: "website",
      locale: isAr ? "ar_SA" : "en_US",
      images: [
        {
          url: OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "Warrantee.io - Warranty Management Platform",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: meta.title,
      description: meta.description,
      images: [OG_IMAGE],
    },
  };
}
