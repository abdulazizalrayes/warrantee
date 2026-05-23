import type { Locale } from "@/lib/i18n";

const BASE_URL = "https://warrantee.io";

export const PUBLIC_AGENT_PATHS = new Set([
  "/",
  "/en",
  "/ar",
  "/en/about",
  "/ar/about",
  "/en/features",
  "/ar/features",
  "/en/pricing",
  "/ar/pricing",
  "/en/contact",
  "/ar/contact",
  "/en/faq",
  "/ar/faq",
  "/en/guide",
  "/ar/guide",
  "/en/verify",
  "/ar/verify",
  "/en/api-docs",
  "/ar/api-docs",
  "/en/terms",
  "/ar/terms",
  "/en/privacy",
  "/ar/privacy",
  "/en/cookies",
  "/ar/cookies",
]);

export type AgentPageKey =
  | "home"
  | "about"
  | "features"
  | "pricing"
  | "contact"
  | "faq"
  | "guide"
  | "verify"
  | "api-docs"
  | "terms"
  | "privacy"
  | "cookies";

type AgentPageContent = {
  title: Record<Locale, string>;
  summary: Record<Locale, string>;
  bullets?: Record<Locale, string[]>;
  nextActions?: Record<Locale, string[]>;
};

const PAGE_CONTENT: Record<AgentPageKey, AgentPageContent> = {
  home: {
    title: {
      en: "Warrantee Overview",
      ar: "نظرة عامة على وارنتي",
    },
    summary: {
      en: "Warrantee is a bilingual warranty management platform for businesses and consumers. It supports warranty registration, approvals, claims, extensions, seller onboarding, verification, certificates, and API-based integrations.",
      ar: "وارنتي منصة ثنائية اللغة لإدارة الضمانات للشركات والأفراد. تدعم تسجيل الضمانات والموافقات والمطالبات والتمديدات وإعداد البائعين والتحقق والشهادات والتكاملات البرمجية.",
    },
    bullets: {
      en: [
        "Track and manage warranties in Arabic and English.",
        "Approve, verify, transfer, extend, and claim warranties.",
        "Support seller workflows, audit trails, certificates, and reminder automation.",
      ],
      ar: [
        "تتبع وإدارة الضمانات بالعربية والإنجليزية.",
        "الموافقة على الضمانات والتحقق منها ونقلها وتمديدها والمطالبة بها.",
        "دعم سير عمل البائعين ومسارات التدقيق والشهادات والتنبيهات الآلية.",
      ],
    },
    nextActions: {
      en: [
        `Visit ${BASE_URL}/en/features for capabilities.`,
        `Visit ${BASE_URL}/en/api-docs for integration guidance.`,
        `Visit ${BASE_URL}/verify to validate public warranties.`,
      ],
      ar: [
        `زر ${BASE_URL}/ar/features للاطلاع على القدرات.`,
        `زر ${BASE_URL}/ar/api-docs للاطلاع على تكاملات النظام.`,
        `زر ${BASE_URL}/verify للتحقق من الضمانات العامة.`,
      ],
    },
  },
  about: {
    title: { en: "About Warrantee", ar: "عن وارنتي" },
    summary: {
      en: "Warrantee focuses on making warranty operations reliable, auditable, and multilingual for Saudi Arabia and the GCC.",
      ar: "تركز وارنتي على جعل عمليات الضمان موثوقة وقابلة للتدقيق ومتعددة اللغات للمملكة ودول الخليج.",
    },
  },
  features: {
    title: { en: "Warrantee Features", ar: "مزايا وارنتي" },
    summary: {
      en: "Core capabilities include approval workflows, expiry reminders, bilingual certificates, dashboard analytics, email ingestion, and ownership-chain tracking.",
      ar: "تشمل القدرات الأساسية سير عمل الموافقات وتذكيرات انتهاء الضمان والشهادات الثنائية اللغة وتحليلات اللوحة وإدخال البريد الإلكتروني وتتبع سلسلة الملكية.",
    },
  },
  pricing: {
    title: { en: "Warrantee Pricing", ar: "أسعار وارنتي" },
    summary: {
      en: "Warrantee offers free, business, and enterprise-oriented pricing tiers depending on warranty volume, workflow depth, and integration needs.",
      ar: "تقدم وارنتي خططاً مجانية وتجارية ومؤسسية بحسب حجم الضمانات وعمق سير العمل واحتياجات التكامل.",
    },
  },
  contact: {
    title: { en: "Contact Warrantee", ar: "التواصل مع وارنتي" },
    summary: {
      en: "Primary business contact is hello@warrantee.io for support, partnerships, and enterprise requests.",
      ar: "جهة الاتصال التجارية الرئيسية هي hello@warrantee.io للدعم والشراكات وطلبات الشركات.",
    },
  },
  faq: {
    title: { en: "Warrantee FAQ", ar: "الأسئلة الشائعة لوارنتي" },
    summary: {
      en: "The FAQ covers common product, workflow, and platform questions for buyers, sellers, and admins.",
      ar: "تغطي الأسئلة الشائعة أكثر الأسئلة المتعلقة بالمنتج وسير العمل والمنصة للمشترين والبائعين والمسؤولين.",
    },
  },
  guide: {
    title: { en: "Warrantee User Guide", ar: "دليل استخدام وارنتي" },
    summary: {
      en: "The guide explains onboarding, warranty creation, approvals, claims, and day-to-day platform operations.",
      ar: "يشرح الدليل الإعداد الأولي وإنشاء الضمانات والموافقات والمطالبات وعمليات التشغيل اليومية للمنصة.",
    },
  },
  verify: {
    title: { en: "Warranty Verification", ar: "التحقق من الضمان" },
    summary: {
      en: "Public verification lets users confirm whether a warranty reference is valid and recorded in Warrantee.",
      ar: "يتيح التحقق العام للمستخدمين التأكد من صحة مرجع الضمان وتسجيله في وارنتي.",
    },
  },
  "api-docs": {
    title: { en: "Warrantee API Documentation", ar: "توثيق API لوارنتي" },
    summary: {
      en: "Warrantee exposes REST APIs for warranty listing, creation, retrieval, updating, verification, coverage, certificates, extensions, and related workflows. Authenticated requests use bearer tokens from Supabase-backed auth.",
      ar: "توفر وارنتي واجهات REST لعرض الضمانات وإنشائها واسترجاعها وتحديثها والتحقق منها والتغطية والشهادات والتمديدات وسير العمل المرتبط بها. تعتمد الطلبات الموثقة على رموز Bearer من نظام المصادقة المبني على Supabase.",
    },
    bullets: {
      en: [
        "Base API URL: https://warrantee.io/api/v1",
        "Authentication: Bearer token",
        "Rate limiting is applied to protect the service",
      ],
      ar: [
        "الرابط الأساسي للواجهة: https://warrantee.io/api/v1",
        "المصادقة: Bearer token",
        "يتم تطبيق حدود للطلبات لحماية الخدمة",
      ],
    },
  },
  terms: {
    title: { en: "Terms of Service", ar: "شروط الخدمة" },
    summary: {
      en: "The terms page defines platform usage conditions, account responsibilities, and service boundaries.",
      ar: "تحدد صفحة الشروط شروط استخدام المنصة ومسؤوليات الحساب وحدود الخدمة.",
    },
  },
  privacy: {
    title: { en: "Privacy Policy", ar: "سياسة الخصوصية" },
    summary: {
      en: "The privacy policy describes how Warrantee collects, stores, processes, and protects user and business data.",
      ar: "توضح سياسة الخصوصية كيفية جمع وارنتي لبيانات المستخدمين والشركات وتخزينها ومعالجتها وحمايتها.",
    },
  },
  cookies: {
    title: { en: "Cookie Policy", ar: "سياسة ملفات الارتباط" },
    summary: {
      en: "The cookie policy explains analytics, preference, and consent-related cookies used across the public site.",
      ar: "توضح سياسة ملفات الارتباط ملفات التحليلات والتفضيلات والموافقة المستخدمة عبر الموقع العام.",
    },
  },
};

export type AgentRouteInfo = {
  locale: Locale;
  pageKey: AgentPageKey;
  canonicalPath: string;
};

export function isAgentMarkdownRequest(acceptHeader: string | null): boolean {
  if (!acceptHeader) return false;
  const normalized = acceptHeader.toLowerCase();
  return normalized.includes("text/markdown") || normalized.includes("text/x-markdown");
}

export function getAgentRouteInfo(pathname: string): AgentRouteInfo | null {
  const normalizedPath = normalizePath(pathname);

  if (!PUBLIC_AGENT_PATHS.has(normalizedPath)) {
    return null;
  }

  if (normalizedPath === "/") {
    return { locale: "en", pageKey: "home", canonicalPath: "/en" };
  }

  const segments = normalizedPath.split("/").filter(Boolean);
  const locale = (segments[0] as Locale) || "en";
  const subPath = segments.slice(1).join("/");

  const pageKey = (subPath === "" ? "home" : subPath) as AgentPageKey;
  if (!(pageKey in PAGE_CONTENT)) {
    return null;
  }

  return {
    locale,
    pageKey,
    canonicalPath: normalizedPath,
  };
}

export function buildAgentMarkdown(pathname: string): string | null {
  const routeInfo = getAgentRouteInfo(pathname);
  if (!routeInfo) {
    return null;
  }

  const { locale, pageKey, canonicalPath } = routeInfo;
  const content = PAGE_CONTENT[pageKey];
  const title = content.title[locale];
  const summary = content.summary[locale];
  const bullets = content.bullets?.[locale] ?? [];
  const nextActions = content.nextActions?.[locale] ?? [];

  const lines = [
    `# ${title}`,
    "",
    `Canonical URL: ${BASE_URL}${canonicalPath}`,
    "",
    summary,
  ];

  if (bullets.length > 0) {
    lines.push("", "## Key Points", "");
    for (const bullet of bullets) {
      lines.push(`- ${bullet}`);
    }
  }

  if (nextActions.length > 0) {
    lines.push("", "## Next Links", "");
    for (const action of nextActions) {
      lines.push(`- ${action}`);
    }
  }

  lines.push(
    "",
    "## Machine Discovery",
    "",
    `- llms.txt: ${BASE_URL}/llms.txt`,
    `- API catalog: ${BASE_URL}/.well-known/api-catalog`,
    `- Agent skills index: ${BASE_URL}/.well-known/agent-skills`,
    `- OAuth authorization server: ${BASE_URL}/.well-known/oauth-authorization-server`,
    `- OAuth protected resource: ${BASE_URL}/.well-known/oauth-protected-resource`,
  );

  return lines.join("\n");
}

export function buildDiscoveryLinkHeader(): string {
  return [
    `</.well-known/api-catalog>; rel="api-catalog"`,
    `</en/api-docs>; rel="service-doc"`,
    `</.well-known/agent-card.json>; rel="agent-card"`,
    `</.well-known/mcp.json>; rel="mcp-server-card"`,
    `</llms.txt>; rel="describedby"; type="text/plain"`,
    `</.well-known/agent-skills>; rel="describedby"; type="application/json"`,
  ].join(", ");
}

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
