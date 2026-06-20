import {
  getContentLocale,
  isIndexedLocale,
  type IndexedLocale,
  type Locale,
} from "@/lib/i18n";

const BASE_URL = "https://warrantee.io";

export const PUBLIC_AGENT_PATHS = new Set([
  "/",
  "/en",
  "/ar",
  "/en/about",
  "/ar/about",
  "/en/blog",
  "/ar/blog",
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
  "/en/security",
  "/ar/security",
  "/en/support",
  "/ar/support",
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
  | "blog"
  | "features"
  | "pricing"
  | "contact"
  | "faq"
  | "guide"
  | "verify"
  | "api-docs"
  | "security"
  | "support"
  | "terms"
  | "privacy"
  | "cookies";

type AgentPageContent = {
  title: Record<IndexedLocale, string>;
  summary: Record<IndexedLocale, string>;
  bullets?: Record<IndexedLocale, string[]>;
  nextActions?: Record<IndexedLocale, string[]>;
};

const PAGE_CONTENT: Record<AgentPageKey, AgentPageContent> = {
  home: {
    title: {
      en: "Warrantee Overview",
      ar: "نظرة عامة على وارنتي",
    },
    summary: {
      en: "Warrantee is a bilingual warranty management platform for businesses and consumers. It supports warranty registration, approvals, claims, extensions, seller onboarding, verification, certificates, and API / CLI / MCP integrations.",
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
        `Visit ${BASE_URL}/en/api-docs for API / CLI / MCP integration guidance.`,
        `Visit ${BASE_URL}/en/verify to validate public warranties.`,
      ],
      ar: [
        `زر ${BASE_URL}/ar/features للاطلاع على القدرات.`,
        `زر ${BASE_URL}/ar/api-docs للاطلاع على تكاملات النظام.`,
        `زر ${BASE_URL}/ar/verify للتحقق من الضمانات العامة.`,
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
  blog: {
    title: { en: "Warrantee Blog", ar: "مدونة وارنتي" },
    summary: {
      en: "The Warrantee blog publishes practical warranty management guides covering tracking, claims workflows, extensions, bilingual operations, seller onboarding, and integrations.",
      ar: "تنشر مدونة وارنتي أدلة عملية لإدارة الضمانات تشمل التتبع وسير عمل المطالبات والتمديدات والتشغيل ثنائي اللغة وانضمام البائعين والتكاملات.",
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
      en: "Warrantee offers Free, Professional, and Enterprise pricing tiers depending on warranty volume, workflow depth, team needs, and integration requirements.",
      ar: "تقدم وارنتي خططاً مجانية واحترافية ومؤسسية بحسب حجم الضمانات وعمق سير العمل واحتياجات الفريق والتكامل.",
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
    title: { en: "Warrantee API / CLI / MCP Guide", ar: "دليل API / CLI / MCP لوارنتي" },
    summary: {
      en: "Warrantee exposes REST APIs, CLI-ready examples, and MCP discovery for warranty listing, creation, retrieval, updating, verification, coverage, certificates, extensions, and related workflows. Authenticated warranty-management requests use Supabase-backed Bearer tokens or scoped per-user integration tokens generated from a signed-in account.",
      ar: "توفر وارنتي واجهات REST وأمثلة CLI واكتشاف MCP لعرض الضمانات وإنشائها واسترجاعها وتحديثها والتحقق منها والتغطية والشهادات والتمديدات وسير العمل المرتبط بها. تعتمد طلبات إدارة الضمانات الموثقة على رموز Bearer أو رموز تكامل محددة الصلاحيات من حساب مسجل.",
    },
    bullets: {
      en: [
        "Base API URL: https://warrantee.io/api/v1",
        "Authentication: Bearer token or scoped x-api-key integration token",
        "Generate keys from Settings > API / CLI / MCP after signing in; never store a Warrantee username or password in an integration",
        "MCP discovery card: https://warrantee.io/.well-known/mcp.json",
        "Hosted MCP endpoint: https://warrantee.io/api/mcp",
        "Rate limiting is applied per user/token and at the IP edge; accounts can hold up to 20 active integration tokens",
      ],
      ar: [
        "الرابط الأساسي للواجهة: https://warrantee.io/api/v1",
        "المصادقة: Bearer token أو رمز تكامل x-api-key محدد الصلاحيات",
        "أنشئ المفاتيح من الإعدادات > API / CLI / MCP بعد تسجيل الدخول؛ لا تحفظ اسم مستخدم أو كلمة مرور Warrantee في التكامل",
        "بطاقة اكتشاف MCP: https://warrantee.io/.well-known/mcp.json",
        "نقطة MCP المستضافة: https://warrantee.io/api/mcp",
        "يتم تطبيق حدود للطلبات لكل مستخدم/رمز وعلى مستوى IP، ويمكن للحساب الاحتفاظ بما يصل إلى 20 رمز تكامل نشط",
      ],
    },
  },
  security: {
    title: { en: "Warrantee Security And Trust", ar: "الأمان والثقة في وارنتي" },
    summary: {
      en: "The security page summarizes Warrantee controls for tenant isolation, API tokens, documents, OCR, Stripe payments, monitoring, and external pentest readiness.",
      ar: "تلخص صفحة الأمان ضوابط وارنتي لعزل الحسابات ورموز API والمستندات وOCR ومدفوعات Stripe والمراقبة وجاهزية اختبار الاختراق الخارجي.",
    },
  },
  support: {
    title: { en: "Warrantee Support", ar: "دعم وارنتي" },
    summary: {
      en: "Support resources cover Warrantee accounts, warranties, claims, seller onboarding, API / CLI / MCP integrations, and contact options for help.",
      ar: "تغطي موارد الدعم حسابات وارنتي والضمانات والمطالبات وانضمام البائعين وتكاملات API / CLI / MCP وخيارات التواصل للحصول على المساعدة.",
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
  const localeSegment = segments[0] || "en";
  const locale = (isIndexedLocale(localeSegment) ? localeSegment : "en") as Locale;
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
  const contentLocale = getContentLocale(locale);
  const content = PAGE_CONTENT[pageKey];
  const title = content.title[contentLocale];
  const summary = content.summary[contentLocale];
  const bullets = content.bullets?.[contentLocale] ?? [];
  const nextActions = content.nextActions?.[contentLocale] ?? [];

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
    `- Hosted MCP endpoint: ${BASE_URL}/api/mcp`,
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
    `</api/mcp>; rel="mcp-server"; type="application/json"`,
    `</llms.txt>; rel="describedby"; type="text/plain"`,
    `</.well-known/agent-skills>; rel="describedby"; type="application/json"`,
  ].join(", ");
}

function normalizePath(pathname: string): string {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}
