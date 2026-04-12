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
  {
    en: { title: string; description: string };
    ar: { title: string; description: string };
  }
> = {
  home: {
    en: {
      title: "Warrantee — Warranty Management Platform",
      description:
        "Track, approve, and claim warranties in one place. Bilingual Arabic and English. Free to start.",
    },
    ar: {
      title: "وارنتي — منصة إدارة الضمانات",
      description:
        "تتبّع الضمانات ووافق عليها وقدّم المطالبات من مكان واحد. باللغتين العربية والإنجليزية. ابدأ مجانًا.",
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
        "Start free, scale as you grow. See Warrantee's pricing plans for individuals and businesses.",
    },
    ar: {
      title: "أسعار وارنتي — خطط بسيطة وواضحة",
      description:
        "ابدأ مجانًا وتوسّع مع نمو أعمالك. اطّلع على خطط أسعار وارنتي للأفراد والشركات.",
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

export function buildPageMetadata(page: PageKey, locale: string): Metadata {
  const isAr = locale === "ar";
  const lang = isAr ? "ar" : "en";
  const meta = PAGE_META[page][lang];
  const pagePath = PAGE_PATHS[page];

  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL(BASE_URL),
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
