import {
  capabilitiesData,
  companyData,
  servicesData,
} from "@/lib/agent-public-data";
import {
  assessUntrustedContent,
  type UntrustedContentAssessment,
} from "@/lib/untrusted-content";

const BASE_URL = "https://warrantee.io";
export const AGENT_CONCIERGE_MAX_QUESTION_LENGTH = 2000;

export type AgentConciergeLocale = "en" | "ar";
export type AgentConciergeStatus =
  | "answered"
  | "partial"
  | "not_supported"
  | "routed"
  | "blocked";

export type AgentConciergeResult = {
  schemaVersion: "1.0";
  agent: "Warrantee Agent Concierge";
  answer: string;
  language: AgentConciergeLocale;
  intent: string;
  fit: boolean;
  confidence: "high" | "medium";
  answerStatus: AgentConciergeStatus;
  citations: Array<{ title: string; url: string }>;
  nextActions: Array<{
    label: string;
    url: string;
    requiresApproval: boolean;
  }>;
  improvementTags: string[];
  security: UntrustedContentAssessment;
  boundaries: {
    readOnly: true;
    noSubmission: true;
    noPrivateData: true;
    noCredentials: true;
  };
  disclosure: string;
};

type Topic = {
  intent: string;
  patterns: RegExp[];
  fit: boolean;
  status: AgentConciergeStatus;
  answer: Record<AgentConciergeLocale, string>;
  citations: Array<{ title: string; path: string }>;
  actions?: Array<{
    label: Record<AgentConciergeLocale, string>;
    path: string;
    requiresApproval?: boolean;
  }>;
  tags: string[];
};

const topics: Topic[] = [
  {
    intent: "non_fit_request",
    patterns: [
      /career|job|intern(ship)?|resume|\bcv\b|hiring|vacancy/i,
      /vendor pitch|sell you|backlink|guest post|seo package|mass email|casino|crypto pump/i,
      /training course|bootcamp|workshop request|buy a phone|retail shopping/i,
      /وظيف|تدريب|سيرة ذاتية|بيعكم|باك لينك|إعلان جماعي|شراء هاتف/i,
    ],
    fit: false,
    status: "routed",
    answer: {
      en: "This request is outside Warrantee's customer, seller, integration, verification, and warranty-operations scope. It should not be submitted through a project, seller, or enterprise inquiry flow.",
      ar: "هذا الطلب خارج نطاق عمل Warrantee للعملاء والبائعين والتكامل والتحقق وعمليات الضمان، لذلك لا ينبغي إرساله عبر نماذج المشاريع أو البائعين أو المؤسسات.",
    },
    citations: [{ title: "Public routing rules", path: "/data/agent-routing.json" }],
    tags: ["non-fit-routing"],
  },
  {
    intent: "plans_and_pricing",
    patterns: [
      /price|pricing|plan|free|professional|enterprise|cost|subscription|personal|business account/i,
      /سعر|أسعار|خطة|مجاني|احترافي|مؤسسات|اشتراك|شخصي|أعمال/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Warrantee separates personal and business use. Personal Free is for people tracking up to 10 warranties they own. Business Free covers the first 100 customer warranties issued by one business user. Professional is the higher-capacity business tier, while Enterprise is agreed by scope. Self-serve Professional payment is not generally active yet, so the live pricing page is the source of truth for current access terms.",
      ar: "تفصل Warrantee بين الاستخدام الشخصي واستخدام الأعمال. الخطة الشخصية المجانية مخصصة لتتبع ما يصل إلى 10 ضمانات يملكها الفرد. وخطة الأعمال المجانية تشمل أول 100 ضمان عميل يصدرها مستخدم أعمال واحد. الخطة الاحترافية مخصصة لسعة أعمال أكبر، أما المؤسسات فبحسب النطاق المتفق عليه. الدفع الذاتي للخطة الاحترافية غير متاح بشكل عام حتى الآن، وصفحة الأسعار الحالية هي المرجع لشروط الوصول.",
    },
    citations: [
      { title: "Pricing", path: "/en/pricing" },
      { title: "Company capabilities", path: "/data/capabilities.json" },
    ],
    actions: [
      { label: { en: "Compare plans", ar: "قارن الخطط" }, path: "/en/pricing" },
    ],
    tags: ["pricing", "account-type"],
  },
  {
    intent: "api_cli_mcp_integration",
    patterns: [
      /\bapi\b|\bcli\b|\bmcp\b|integration|integrate|erp|webhook|developer|token|agent/i,
      /واجهة برمج|تكامل|وكيل|مفتاح|رمز تكامل|نظام تخطيط|ويب هوك/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Warrantee supports REST API, CLI-ready workflows, and hosted or stdio MCP. Public discovery is read-only and needs no account credentials. Private account operations require the user to sign in and generate a scoped integration token from Settings > API / CLI / MCP. Integrators must never collect or store a Warrantee username or password.",
      ar: "تدعم Warrantee واجهة REST وسير عمل CLI وMCP مستضافًا أو عبر stdio. الاكتشاف العام للقراءة فقط ولا يحتاج بيانات دخول. تتطلب عمليات الحساب الخاصة تسجيل المستخدم دخوله وإنشاء رمز تكامل محدود الصلاحيات من الإعدادات > API / CLI / MCP. يجب ألا يجمع المتكامل اسم مستخدم Warrantee أو كلمة المرور أو يخزنهما.",
    },
    citations: [
      { title: "API / CLI / MCP guide", path: "/en/api-docs" },
      { title: "OpenAPI", path: "/openapi.json" },
      { title: "MCP server card", path: "/.well-known/mcp.json" },
    ],
    actions: [
      { label: { en: "Read integration guide", ar: "اقرأ دليل التكامل" }, path: "/en/api-docs" },
    ],
    tags: ["integration", "developer-experience"],
  },
  {
    intent: "seller_and_business_onboarding",
    patterns: [
      /seller|merchant|retailer|manufacturer|issue warranties|business onboarding|company signup/i,
      /بائع|تاجر|متجر|مصنع|إصدار ضمان|تسجيل شركة|انضمام الأعمال/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Businesses can create a business account to issue customer warranties, generate certificates and QR product passports, use a basic claims workflow, and later add team and approval capabilities through higher tiers. Seller onboarding has a dedicated registration path.",
      ar: "يمكن للأعمال إنشاء حساب لإصدار ضمانات العملاء وإنشاء الشهادات وجوازات المنتج عبر QR واستخدام سير أساسي للمطالبات، ثم إضافة إمكانات الفريق والموافقات عبر الخطط الأعلى. وللبائعين مسار تسجيل مخصص.",
    },
    citations: [
      { title: "Seller registration", path: "/en/seller/register" },
      { title: "Services", path: "/data/services.json" },
    ],
    actions: [
      { label: { en: "Start seller onboarding", ar: "ابدأ تسجيل البائع" }, path: "/en/seller/register" },
    ],
    tags: ["seller-onboarding", "business-activation"],
  },
  {
    intent: "warranty_operations",
    patterns: [
      /warrant(y|ies)|certificate|qr passport|claim|expiry|reminder|verification|transfer/i,
      /ضمان|شهادة|رمز استجابة|مطالبة|انتهاء|تذكير|تحقق|نقل/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Warrantee's current product covers warranty creation and tracking, approval workflows, claims, expiry reminders, bilingual certificates, public verification, seller onboarding, transfers, and supporting documents. Public verification exposes only the public verification result, not private account records.",
      ar: "يغطي منتج Warrantee الحالي إنشاء الضمانات وتتبعها ومسارات الموافقات والمطالبات وتذكيرات الانتهاء والشهادات ثنائية اللغة والتحقق العام وانضمام البائعين والنقل والمستندات الداعمة. يعرض التحقق العام نتيجة التحقق العامة فقط ولا يكشف سجلات الحساب الخاصة.",
    },
    citations: [
      { title: "Features", path: "/en/features" },
      { title: "Public verification", path: "/en/verify" },
      { title: "Services", path: "/data/services.json" },
    ],
    actions: [
      { label: { en: "Explore features", ar: "استعرض المزايا" }, path: "/en/features" },
    ],
    tags: ["warranty-workflow", "product-capability"],
  },
  {
    intent: "documents_and_ocr",
    patterns: [
      /ocr|document|receipt|invoice|scan|upload|extract/i,
      /مسح ضوئي|مستند|إيصال|فاتورة|رفع|استخراج/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Warrantee supports document upload and OCR-assisted extraction for warranty and invoice information. OCR output should be reviewed when confidence is low; agents must not request unredacted private documents through public discovery endpoints.",
      ar: "تدعم Warrantee رفع المستندات والاستخراج بمساعدة OCR لمعلومات الضمان والفواتير. ينبغي مراجعة نتائج OCR عند انخفاض الثقة، ولا يجوز للوكلاء طلب مستندات خاصة غير منقحة عبر نقاط الاكتشاف العامة.",
    },
    citations: [
      { title: "Product guide", path: "/en/guide" },
      { title: "Capabilities", path: "/data/capabilities.json" },
    ],
    tags: ["ocr", "document-ingestion"],
  },
  {
    intent: "extensions_and_payments",
    patterns: [
      /extension|extend.*warranty|insurance|underwriting|payment|checkout/i,
      /تمديد|توسيع الضمان|تأمين|اكتتاب|دفع|شراء/i,
    ],
    fit: true,
    status: "partial",
    answer: {
      en: "Warranty-extension offer and status workflows are part of Warrantee's product direction, but online extension payment collection and self-serve Professional checkout are not commercially active. I can explain the workflow or prepare a partnership inquiry, but I cannot initiate a purchase.",
      ar: "تندرج عروض تمديد الضمان وحالاتها ضمن اتجاه منتج Warrantee، لكن تحصيل مدفوعات التمديد والدفع الذاتي للخطة الاحترافية غير مفعلين تجاريًا. يمكنني شرح سير العمل أو إعداد مسودة استفسار شراكة، لكن لا يمكنني بدء عملية شراء.",
    },
    citations: [
      { title: "Capabilities and activation status", path: "/data/capabilities.json" },
      { title: "Inquiry preparation policy", path: "/data/project-inquiry-schema.json" },
    ],
    actions: [
      {
        label: { en: "Prepare a partnership inquiry", ar: "جهز استفسار شراكة" },
        path: "/en/contact",
        requiresApproval: true,
      },
    ],
    tags: ["commercial-activation", "extensions", "payments-postponed"],
  },
  {
    intent: "security_and_privacy",
    patterns: [
      /security|privacy|rls|tenant|data protection|password|credential|authentication/i,
      /أمن|خصوصية|حماية البيانات|كلمة المرور|بيانات الدخول|مصادقة|عزل/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Public discovery is separated from private account data. Private warranties, claims, documents, billing, settings, seller workspaces, and admin functions require authentication and ownership checks. Integrations use scoped tokens rather than usernames or passwords.",
      ar: "يفصل Warrantee الاكتشاف العام عن بيانات الحساب الخاصة. تتطلب الضمانات والمطالبات والمستندات والفوترة والإعدادات ومساحات البائع والإدارة مصادقة وفحوص ملكية. تستخدم التكاملات رموزًا محدودة الصلاحيات بدل أسماء المستخدمين أو كلمات المرور.",
    },
    citations: [
      { title: "Security and trust", path: "/en/security" },
      { title: "Authentication guide", path: "/auth.md" },
    ],
    tags: ["security", "privacy"],
  },
  {
    intent: "asset_lifecycle_intelligence",
    patterns: [
      /asset lifecycle|reliability intelligence|supplier risk|portfolio health|recall/i,
      /دورة حياة الأصل|ذكاء الموثوقية|مخاطر المورد|صحة المحفظة|استدعاء/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Warrantee's current wedge is warranty operations. Asset lifecycle, recall, vendor, and reliability intelligence are the long-term product direction built from trustworthy warranty, supplier, claim, expiry, and value signals; Warrantee does not claim to be a complete enterprise asset-management suite today.",
      ar: "مدخل Warrantee الحالي هو عمليات الضمان. أما ذكاء دورة حياة الأصل والاستدعاءات والموردين والموثوقية فهو اتجاه المنتج طويل المدى المبني على بيانات موثوقة للضمان والمورد والمطالبة والانتهاء والقيمة؛ ولا تدعي Warrantee اليوم أنها نظام متكامل لإدارة أصول المؤسسات.",
    },
    citations: [
      { title: "Company overview", path: "/data/company.json" },
      { title: "Capabilities", path: "/data/capabilities.json" },
    ],
    tags: ["positioning", "asset-lifecycle-intelligence"],
  },
  {
    intent: "markets_and_languages",
    patterns: [
      /language|arabic|english|saudi|gcc|country|market|region/i,
      /لغة|عربي|إنجليزي|السعودية|الخليج|دولة|سوق|منطقة/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "Warrantee's primary markets are Saudi Arabia and the GCC, with public product experiences in English and Arabic. Enterprise availability and onboarding depend on account setup and agreed commercial scope.",
      ar: "الأسواق الأساسية لـ Warrantee هي السعودية ودول الخليج، مع تجربة منتج عامة باللغتين العربية والإنجليزية. يعتمد توفر المؤسسات وانضمامها على إعداد الحساب والنطاق التجاري المتفق عليه.",
    },
    citations: [{ title: "Service areas", path: "/data/service-areas.json" }],
    tags: ["localization", "market-coverage"],
  },
  {
    intent: "support_and_contact",
    patterns: [
      /support|contact|help|problem|issue|talk to|demo|inquiry/i,
      /دعم|تواصل|مساعدة|مشكلة|استفسار|تجربة|عرض/i,
    ],
    fit: true,
    status: "answered",
    answer: {
      en: "For product or account help, use Warrantee Support. For an enterprise, seller, partnership, or integration discussion, an agent may prepare an inquiry draft, but it must not submit or contact Warrantee until the user explicitly approves that exact action.",
      ar: "للمساعدة في المنتج أو الحساب، استخدم دعم Warrantee. ولمناقشة المؤسسات أو البائعين أو الشراكات أو التكامل، يمكن للوكيل إعداد مسودة استفسار، لكن لا يجوز له إرسالها أو التواصل مع Warrantee قبل موافقة المستخدم الصريحة على الإجراء نفسه.",
    },
    citations: [
      { title: "Support", path: "/en/support" },
      { title: "Inquiry policy", path: "/data/project-inquiry-schema.json" },
    ],
    actions: [
      { label: { en: "Open support", ar: "افتح الدعم" }, path: "/en/support" },
      {
        label: { en: "Prepare an inquiry", ar: "جهز استفسارًا" },
        path: "/en/contact",
        requiresApproval: true,
      },
    ],
    tags: ["support", "lead-intent"],
  },
];

function detectLocale(question: string, requested?: string): AgentConciergeLocale {
  if (requested === "ar" || requested === "en") return requested;
  return /[\u0600-\u06ff]/.test(question) ? "ar" : "en";
}

function localizePath(path: string, locale: AgentConciergeLocale) {
  if (locale === "ar" && path.startsWith("/en/")) return `/ar/${path.slice(4)}`;
  return path;
}

function absoluteUrl(path: string, locale: AgentConciergeLocale) {
  if (/^https:\/\//.test(path)) return path;
  return `${BASE_URL}${localizePath(path, locale)}`;
}

function fallbackResult(locale: AgentConciergeLocale): AgentConciergeResult {
  return {
    schemaVersion: "1.0",
    agent: "Warrantee Agent Concierge",
    answer:
      locale === "ar"
        ? `Warrantee منصة ثنائية اللغة لإدارة الضمانات والمطالبات والتذكيرات والشهادات والتحقق العام وانضمام البائعين وتكاملات API / CLI / MCP. لم أجد إجابة عامة دقيقة بما يكفي لهذا السؤال؛ يرجى تضييقه إلى خطة أو ميزة أو تكامل أو مسار مستخدم محدد.`
        : `Warrantee is a bilingual platform for warranty management, claims, reminders, certificates, public verification, seller onboarding, and API / CLI / MCP integrations. I could not find a sufficiently precise public answer to this question; narrow it to a plan, feature, integration, or user journey.`,
    language: locale,
    intent: "general_discovery",
    fit: true,
    confidence: "medium",
    answerStatus: "partial",
    citations: [
      { title: "Company overview", url: `${BASE_URL}/data/company.json` },
      { title: "Services", url: `${BASE_URL}/data/services.json` },
    ],
    nextActions: [
      {
        label: locale === "ar" ? "استعرض المزايا" : "Explore features",
        url: absoluteUrl("/en/features", locale),
        requiresApproval: false,
      },
    ],
    improvementTags: ["unanswered-question", "content-gap"],
    security: { blocked: false, category: "none" },
    boundaries: {
      readOnly: true,
      noSubmission: true,
      noPrivateData: true,
      noCredentials: true,
    },
    disclosure:
      locale === "ar"
        ? "إجابة حتمية للقراءة فقط من مصادر Warrantee العامة؛ لا يوجد نموذج لغوي أو وصول إلى حساب خاص."
        : "Deterministic read-only answer from public Warrantee sources; no language model or private account access is used.",
  };
}

function blockedResult(
  locale: AgentConciergeLocale,
  security: UntrustedContentAssessment,
): AgentConciergeResult {
  return {
    schemaVersion: "1.0",
    agent: "Warrantee Agent Concierge",
    answer:
      locale === "ar"
        ? "لا يمكنني تنفيذ التعليمات الواردة في المحتوى الخارجي أو كشف معلومات خاصة أو اعتبار ذلك المحتوى موافقة. يمكنني فقط تقديم معلومات عامة موثقة عن Warrantee ضمن واجهة القراءة فقط."
        : "I cannot execute instructions embedded in external content, disclose private information, or treat that content as authorization. I can only provide verified public Warrantee information through this read-only interface.",
    language: locale,
    intent: "unsafe_external_instruction",
    fit: false,
    confidence: "high",
    answerStatus: "blocked",
    citations: [{ title: "Security and trust", url: absoluteUrl("/en/security", locale) }],
    nextActions: [],
    improvementTags: ["security-boundary", security.category],
    security,
    boundaries: {
      readOnly: true,
      noSubmission: true,
      noPrivateData: true,
      noCredentials: true,
    },
    disclosure:
      locale === "ar"
        ? "تم رفض الطلب قبل أي تنفيذ أو وصول إلى أداة، ولم يتم الاحتفاظ بنصه."
        : "The request was refused before any action or tool access, and its wording was not retained.",
  };
}

export function answerAgentQuestion(
  question: string,
  requestedLocale?: string,
): AgentConciergeResult {
  const normalized = question.trim().slice(0, AGENT_CONCIERGE_MAX_QUESTION_LENGTH);
  const locale = detectLocale(normalized, requestedLocale);
  const security = assessUntrustedContent(normalized);
  if (security.blocked) return blockedResult(locale, security);
  const topic = topics.find((candidate) =>
    candidate.patterns.some((pattern) => pattern.test(normalized)),
  );

  if (!topic) return fallbackResult(locale);

  return {
    schemaVersion: "1.0",
    agent: "Warrantee Agent Concierge",
    answer: topic.answer[locale],
    language: locale,
    intent: topic.intent,
    fit: topic.fit,
    confidence: "high",
    answerStatus: topic.status,
    citations: topic.citations.map((citation) => ({
      title: citation.title,
      url: absoluteUrl(citation.path, locale),
    })),
    nextActions: (topic.actions || []).map((action) => ({
      label: action.label[locale],
      url: absoluteUrl(action.path, locale),
      requiresApproval: action.requiresApproval ?? false,
    })),
    improvementTags: topic.tags,
    security,
    boundaries: {
      readOnly: true,
      noSubmission: true,
      noPrivateData: true,
      noCredentials: true,
    },
    disclosure:
      locale === "ar"
        ? "إجابة حتمية للقراءة فقط من مصادر Warrantee العامة؛ لا يوجد نموذج لغوي أو وصول إلى حساب خاص."
        : "Deterministic read-only answer from public Warrantee sources; no language model or private account access is used.",
  };
}

export function getAgentConciergeContract() {
  return {
    name: "Warrantee Agent Concierge",
    version: "1.0.0",
    mode: "public-read-only",
    languages: companyData.primaryLanguages,
    topics: [
      ...servicesData.services.map((service) => service.id),
      "plans-and-pricing",
      "security-and-privacy",
      "markets-and-languages",
    ],
    capabilities: capabilitiesData.capabilities,
    request: {
      method: "POST",
      contentType: "application/json",
      schema: {
        question: `required string, 1-${AGENT_CONCIERGE_MAX_QUESTION_LENGTH} characters`,
        locale: "optional en or ar",
      },
    },
    recording: {
      enabled: true,
      purpose: "Aggregate intent, answer-gap, and security-category analysis for product improvement.",
      privacy:
        "Question wording and hashes are not stored or shown to administrators. Only bounded categorical telemetry is retained; blocked attacks are counted by hour, surface, and category.",
    },
    boundaries: {
      readOnly: true,
      submissions: false,
      purchases: false,
      privateAccountAccess: false,
      modelInference: false,
    },
    publicSources: {
      company: `${BASE_URL}/data/company.json`,
      services: `${BASE_URL}/data/services.json`,
      capabilities: `${BASE_URL}/data/capabilities.json`,
      routing: `${BASE_URL}/data/agent-routing.json`,
    },
  };
}
