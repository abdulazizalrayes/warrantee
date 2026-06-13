import {
  getContentLocale,
  isIndexedLocale,
  type IndexedLocale,
} from "@/lib/locales";

export type SeoPageKind = "resource" | "compare";

export type SeoContentPage = {
  slug: string;
  kind: SeoPageKind;
  title: Record<IndexedLocale, string>;
  description: Record<IndexedLocale, string>;
  eyebrow: Record<IndexedLocale, string>;
  intro: Record<IndexedLocale, string>;
  audience: Record<IndexedLocale, string>;
  sections: Array<{
    title: Record<IndexedLocale, string>;
    body: Record<IndexedLocale, string>;
    bullets: Record<IndexedLocale, string[]>;
  }>;
  proof: Record<IndexedLocale, string[]>;
  faq: Array<{
    question: Record<IndexedLocale, string>;
    answer: Record<IndexedLocale, string>;
  }>;
  cta: Record<IndexedLocale, { title: string; body: string; primary: string }>;
};

export const RESOURCE_PAGES: SeoContentPage[] = [
  {
    slug: "warranty-management-software",
    kind: "resource",
    title: {
      en: "Warranty Management Software for Businesses",
      ar: "برنامج إدارة الضمانات للشركات",
    },
    description: {
      en: "Learn how warranty management software helps teams register warranties, track expiry, manage claims, issue certificates, and keep audit-ready records.",
      ar: "تعرّف على كيف يساعد برنامج إدارة الضمانات الفرق على تسجيل الضمانات وتتبع الانتهاء وإدارة المطالبات وإصدار الشهادات وحفظ السجلات القابلة للتدقيق.",
    },
    eyebrow: {
      en: "Warranty management software",
      ar: "برنامج إدارة الضمانات",
    },
    intro: {
      en: "Warranty management software replaces scattered spreadsheets, inboxes, and manual follow-ups with one operating record for every warranty. Warrantee.io is built for sellers and businesses that need bilingual certificates, approval history, expiry reminders, claims workflows, and public verification.",
      ar: "يستبدل برنامج إدارة الضمانات الجداول المتفرقة والبريد والمتابعات اليدوية بسجل تشغيلي واحد لكل ضمان. صُممت Warrantee.io للبائعين والشركات التي تحتاج إلى شهادات ثنائية اللغة وسجل موافقات وتنبيهات انتهاء وسير مطالبات وتحقق عام.",
    },
    audience: {
      en: "Best for retailers, distributors, ecommerce operators, service teams, and businesses that issue or manage product warranties at scale.",
      ar: "مناسب للمتاجر والموزعين ومشغلي التجارة الإلكترونية وفرق الخدمة والشركات التي تصدر أو تدير ضمانات المنتجات على نطاق واسع.",
    },
    sections: [
      {
        title: { en: "What it should centralize", ar: "ما الذي يجب أن يجمّعه النظام" },
        body: {
          en: "A real warranty system should keep the commercial record, customer record, product record, coverage terms, documents, status, and activity history together.",
          ar: "يجب أن يجمع نظام الضمان الحقيقي السجل التجاري وبيانات العميل والمنتج وشروط التغطية والمستندات والحالة وسجل النشاط في مكان واحد.",
        },
        bullets: {
          en: [
            "Product, serial number, seller, buyer, purchase date, and coverage period.",
            "Receipts, warranty cards, photos, and generated certificates.",
            "Approval, rejection, claim, transfer, and extension history.",
          ],
          ar: [
            "المنتج والرقم التسلسلي والبائع والمشتري وتاريخ الشراء ومدة التغطية.",
            "الفواتير وبطاقات الضمان والصور والشهادات المنشأة.",
            "سجل الموافقة والرفض والمطالبة والنقل والتمديد.",
          ],
        },
      },
      {
        title: { en: "Why teams move beyond spreadsheets", ar: "لماذا تتجاوز الفرق الجداول" },
        body: {
          en: "Spreadsheets can list warranties, but they do not enforce ownership, permissions, reminders, evidence, or customer-facing verification. That gap becomes expensive when claims, disputes, or audits start.",
          ar: "يمكن للجداول أن تعرض قائمة الضمانات، لكنها لا تفرض الملكية والصلاحيات والتنبيهات والأدلة والتحقق الموجه للعميل. تظهر تكلفة هذه الفجوة عند بدء المطالبات أو النزاعات أو التدقيق.",
        },
        bullets: {
          en: [
            "No reliable public verification page for buyers or service teams.",
            "No consistent audit trail when a warranty changes status.",
            "No controlled API / CLI / MCP path for ERP, ecommerce, support systems, scripts, or agents.",
          ],
          ar: [
            "لا توجد صفحة تحقق عامة موثوقة للمشترين أو فرق الخدمة.",
            "لا يوجد مسار تدقيق ثابت عند تغيّر حالة الضمان.",
            "لا يوجد مسار مضبوط عبر API / CLI / MCP لأنظمة ERP أو التجارة الإلكترونية أو الدعم أو السكريبتات أو الوكلاء.",
          ],
        },
      },
    ],
    proof: {
      en: [
        "Bilingual Arabic and English workflows.",
        "Public warranty verification and certificate paths.",
        "API / CLI / MCP-ready architecture for registered business users.",
      ],
      ar: [
        "سير عمل ثنائي اللغة بالعربية والإنجليزية.",
        "مسارات تحقق عام وشهادات ضمان.",
        "بنية جاهزة للتكامل عبر API / CLI / MCP للمستخدمين التجاريين المسجلين.",
      ],
    },
    faq: [
      {
        question: {
          en: "What is warranty management software?",
          ar: "ما هو برنامج إدارة الضمانات؟",
        },
        answer: {
          en: "Warranty management software is a system for creating, tracking, verifying, extending, and resolving warranties with evidence and workflow controls.",
          ar: "برنامج إدارة الضمانات هو نظام لإنشاء الضمانات وتتبعها والتحقق منها وتمديدها ومعالجة مطالباتها مع الأدلة وضوابط سير العمل.",
        },
      },
      {
        question: {
          en: "Who uses Warrantee.io?",
          ar: "من يستخدم Warrantee.io؟",
        },
        answer: {
          en: "Warrantee.io is built for businesses, sellers, distributors, and service teams that need warranty records to stay reliable after the sale.",
          ar: "صُممت Warrantee.io للشركات والبائعين والموزعين وفرق الخدمة التي تحتاج إلى بقاء سجلات الضمان موثوقة بعد البيع.",
        },
      },
    ],
    cta: {
      en: {
        title: "Start with a controlled warranty workflow",
        body: "Create a free account or speak with the Warrantee team about seller and API / CLI / MCP workflows.",
        primary: "Start free",
      },
      ar: {
        title: "ابدأ بسير ضمان مضبوط",
        body: "أنشئ حسابًا مجانيًا أو تواصل مع فريق Warrantee حول مسارات البائعين والتكامل.",
        primary: "ابدأ مجانًا",
      },
    },
  },
  {
    slug: "warranty-claims-management",
    kind: "resource",
    title: {
      en: "Warranty Claims Management",
      ar: "إدارة مطالبات الضمان",
    },
    description: {
      en: "A practical guide to warranty claims management: evidence, claim intake, seller review, decisions, status tracking, and customer communication.",
      ar: "دليل عملي لإدارة مطالبات الضمان: الأدلة واستقبال المطالبات ومراجعة البائع والقرارات وتتبع الحالة والتواصل مع العميل.",
    },
    eyebrow: { en: "Claims workflow", ar: "سير المطالبات" },
    intro: {
      en: "Warranty claims fail when proof is scattered, responsibilities are unclear, and decisions happen outside the system. A reliable claims workflow connects the warranty record, documents, customer notes, seller review, and final decision.",
      ar: "تفشل مطالبات الضمان عندما تكون الأدلة مشتتة والمسؤوليات غير واضحة والقرارات خارج النظام. يربط سير المطالبات الموثوق سجل الضمان والمستندات وملاحظات العميل ومراجعة البائع والقرار النهائي.",
    },
    audience: {
      en: "Best for service teams, sellers, support operations, and companies that need fewer blind disputes.",
      ar: "مناسب لفرق الخدمة والبائعين وعمليات الدعم والشركات التي تريد تقليل النزاعات غير الواضحة.",
    },
    sections: [
      {
        title: { en: "Claim intake", ar: "استقبال المطالبة" },
        body: {
          en: "The claim should start from a verified warranty so product data, coverage dates, customer details, and documents are already attached.",
          ar: "يجب أن تبدأ المطالبة من ضمان موثق بحيث تكون بيانات المنتج وتواريخ التغطية وبيانات العميل والمستندات مرفقة مسبقًا.",
        },
        bullets: {
          en: ["Issue description", "Evidence attachments", "Warranty status and coverage check"],
          ar: ["وصف المشكلة", "مرفقات الأدلة", "فحص حالة الضمان والتغطية"],
        },
      },
      {
        title: { en: "Decision record", ar: "سجل القرار" },
        body: {
          en: "Approvals, rejections, and follow-ups need a visible decision trail. That protects the seller and gives the buyer a clearer answer.",
          ar: "تحتاج الموافقات والرفض والمتابعات إلى مسار قرار واضح. هذا يحمي البائع ويمنح المشتري إجابة أوضح.",
        },
        bullets: {
          en: ["Decision owner", "Reason and timestamp", "Customer-visible status"],
          ar: ["مالك القرار", "السبب والتوقيت", "حالة مرئية للعميل"],
        },
      },
    ],
    proof: {
      en: ["Claim pages connect to warranty records.", "Documents stay attached to the decision.", "Status tracking reduces customer uncertainty."],
      ar: ["صفحات المطالبة مرتبطة بسجلات الضمان.", "تبقى المستندات مرتبطة بالقرار.", "تتبع الحالة يقلل عدم وضوح العميل."],
    },
    faq: [
      {
        question: { en: "What makes warranty claims easier to resolve?", ar: "ما الذي يجعل مطالبات الضمان أسهل في المعالجة؟" },
        answer: {
          en: "Clear evidence, verified warranty data, defined ownership, and visible status history make claims easier to resolve.",
          ar: "الأدلة الواضحة وبيانات الضمان الموثقة وتحديد المسؤولية وسجل الحالة الواضح تجعل المطالبات أسهل في المعالجة.",
        },
      },
    ],
    cta: {
      en: { title: "Bring claims back to the warranty record", body: "Use Warrantee to keep claims, evidence, and decisions connected.", primary: "Create account" },
      ar: { title: "أعد المطالبات إلى سجل الضمان", body: "استخدم Warrantee لربط المطالبات والأدلة والقرارات.", primary: "إنشاء حساب" },
    },
  },
  {
    slug: "digital-warranty-certificates",
    kind: "resource",
    title: {
      en: "Digital Warranty Certificates",
      ar: "شهادات الضمان الرقمية",
    },
    description: {
      en: "How digital warranty certificates improve proof, verification, QR access, bilingual support, and customer trust after purchase.",
      ar: "كيف تحسن شهادات الضمان الرقمية الإثبات والتحقق والوصول عبر QR والدعم ثنائي اللغة وثقة العميل بعد الشراء.",
    },
    eyebrow: { en: "Certificates and proof", ar: "الشهادات والإثبات" },
    intro: {
      en: "A digital warranty certificate should be more than a PDF. It should connect the buyer to a live verification record, coverage terms, product details, seller identity, and claim path.",
      ar: "يجب أن تكون شهادة الضمان الرقمية أكثر من ملف PDF. يجب أن تربط المشتري بسجل تحقق مباشر وشروط التغطية وبيانات المنتج وهوية البائع ومسار المطالبة.",
    },
    audience: {
      en: "Best for sellers that want every issued warranty to become a trusted post-purchase touchpoint.",
      ar: "مناسب للبائعين الذين يريدون أن يتحول كل ضمان صادر إلى نقطة ثقة بعد الشراء.",
    },
    sections: [
      {
        title: { en: "What certificates should include", ar: "ما الذي يجب أن تتضمنه الشهادة" },
        body: {
          en: "The certificate should clearly show the product, customer, warranty term, reference number, and verification link.",
          ar: "يجب أن تعرض الشهادة المنتج والعميل ومدة الضمان ورقم المرجع ورابط التحقق بوضوح.",
        },
        bullets: {
          en: ["Reference number", "QR verification path", "Coverage terms in Arabic and English"],
          ar: ["رقم مرجعي", "مسار تحقق عبر QR", "شروط تغطية بالعربية والإنجليزية"],
        },
      },
      {
        title: { en: "Why live verification matters", ar: "لماذا يهم التحقق المباشر" },
        body: {
          en: "Static PDFs can be copied or separated from the current warranty status. A live passport-style page can show whether the warranty is active, claimed, transferred, or expired.",
          ar: "يمكن نسخ ملفات PDF الثابتة أو فصلها عن حالة الضمان الحالية. صفحة حية بنمط جواز المنتج يمكنها إظهار ما إذا كان الضمان نشطًا أو تمت المطالبة به أو نقله أو انتهى.",
        },
        bullets: {
          en: ["Reduces counterfeit proof", "Improves service desk confidence", "Creates a direct claim and extension path"],
          ar: ["يقلل الإثبات المزيف", "يرفع ثقة فريق الخدمة", "ينشئ مسارًا مباشرًا للمطالبة والتمديد"],
        },
      },
    ],
    proof: {
      en: ["Bilingual certificate generation.", "Public verification route.", "QR-friendly warranty passport flow."],
      ar: ["إنشاء شهادات ثنائية اللغة.", "مسار تحقق عام.", "تدفق جواز ضمان مناسب لـ QR."],
    },
    faq: [
      {
        question: { en: "Can a digital warranty certificate replace a paper card?", ar: "هل يمكن أن تحل شهادة الضمان الرقمية محل البطاقة الورقية؟" },
        answer: {
          en: "For many operational workflows, yes. The certificate should still preserve the terms, proof, seller identity, and verification path required by the business.",
          ar: "في كثير من المسارات التشغيلية نعم. يجب أن تحفظ الشهادة الشروط والإثبات وهوية البائع ومسار التحقق المطلوب من الشركة.",
        },
      },
    ],
    cta: {
      en: { title: "Issue certificates buyers can verify", body: "Create bilingual warranty certificates with live verification paths.", primary: "Start issuing" },
      ar: { title: "أصدر شهادات يمكن للمشترين التحقق منها", body: "أنشئ شهادات ضمان ثنائية اللغة مع مسارات تحقق مباشرة.", primary: "ابدأ الإصدار" },
    },
  },
  {
    slug: "erp-warranty-api-integration",
    kind: "resource",
    title: {
      en: "ERP Warranty API / CLI / MCP Integration",
      ar: "تكامل API / CLI / MCP للضمانات مع ERP",
    },
    description: {
      en: "How ERP, ecommerce, scripts, and agents can connect to warranty workflows using scoped integration tokens, verified users, and controlled rate limits.",
      ar: "كيف يمكن لأنظمة ERP والتجارة الإلكترونية والسكريبتات والوكلاء الاتصال بسير الضمانات عبر رموز تكامل محددة ومستخدمين موثقين وحدود طلبات مضبوطة.",
    },
    eyebrow: { en: "API / CLI / MCP and systems integration", ar: "تكامل API / CLI / MCP والأنظمة" },
    intro: {
      en: "Warranty data often starts in ERP, ecommerce, POS, or service systems. An integration-ready platform lets registered business users create and verify warranties without opening broad public access.",
      ar: "غالبًا تبدأ بيانات الضمان في أنظمة ERP أو التجارة الإلكترونية أو نقاط البيع أو الخدمة. تتيح المنصة الجاهزة للتكامل للمستخدمين التجاريين المسجلين إنشاء الضمانات والتحقق منها دون فتح وصول عام واسع.",
    },
    audience: {
      en: "Best for operations teams connecting ecommerce checkout, ERP item records, support desks, or seller portals.",
      ar: "مناسب لفرق التشغيل التي تربط الدفع الإلكتروني أو سجلات المنتجات في ERP أو مكاتب الدعم أو بوابات البائعين.",
    },
    sections: [
      {
        title: { en: "Access should be scoped", ar: "يجب أن يكون الوصول محدد النطاق" },
        body: {
          en: "Business API / CLI / MCP access should require registered users, scoped tokens, ownership checks, and rate limits. That protects customer records and prevents integrations from seeing another company's data.",
          ar: "يجب أن تتطلب واجهات الأعمال مستخدمين مسجلين ورموزًا محددة النطاق وفحص ملكية وحدود طلبات. هذا يحمي سجلات العملاء ويمنع التكاملات من رؤية بيانات شركة أخرى.",
        },
        bullets: {
          en: ["Authenticated integration tokens", "Company-level ownership checks", "Peak and abuse rate limits"],
          ar: ["رموز تكامل مصادق عليها", "فحص ملكية على مستوى الشركة", "حدود طلبات للذروة ومنع الإساءة"],
        },
      },
      {
        title: { en: "Useful integration events", ar: "أحداث تكامل مفيدة" },
        body: {
          en: "The most valuable flows are warranty creation after purchase, warranty verification for service teams, claim intake, certificate generation, and status sync.",
          ar: "أهم المسارات هي إنشاء الضمان بعد الشراء والتحقق للفرق الخدمية واستقبال المطالبات وإنشاء الشهادات ومزامنة الحالة.",
        },
        bullets: {
          en: ["Create warranty after order fulfillment", "Verify warranty at service desk", "Sync claim and extension status"],
          ar: ["إنشاء الضمان بعد تنفيذ الطلب", "التحقق من الضمان في مركز الخدمة", "مزامنة حالة المطالبة والتمديد"],
        },
      },
    ],
    proof: {
      en: ["Public API / CLI / MCP documentation is indexed.", "API routes require authentication.", "Integration tokens are part of production smoke checks."],
      ar: ["وثائق API / CLI / MCP العامة مفهرسة.", "مسارات API تتطلب المصادقة.", "رموز التكامل ضمن فحوص الإنتاج."],
    },
    faq: [
      {
        question: { en: "Can customers use Warrantee API / CLI / MCP directly?", ar: "هل يمكن للعملاء استخدام API / CLI / MCP في Warrantee مباشرة؟" },
        answer: {
          en: "API / CLI / MCP access should be limited to registered business users and integration tokens with company-level authorization.",
          ar: "يجب أن يقتصر الوصول إلى API على المستخدمين التجاريين المسجلين ورموز التكامل ذات التفويض على مستوى الشركة.",
        },
      },
    ],
    cta: {
      en: { title: "Connect warranty workflows to your systems", body: "Review the API / CLI / MCP guide or contact Warrantee for integration planning.", primary: "View API / CLI / MCP guide" },
      ar: { title: "اربط سير الضمان بأنظمتك", body: "راجع دليل API / CLI / MCP أو تواصل مع Warrantee لتخطيط التكامل.", primary: "عرض دليل API / CLI / MCP" },
    },
  },
  {
    slug: "saudi-gcc-warranty-operations",
    kind: "resource",
    title: {
      en: "Saudi and GCC Warranty Operations",
      ar: "تشغيل الضمانات في السعودية والخليج",
    },
    description: {
      en: "Warranty operations guidance for Saudi Arabia and GCC businesses that need Arabic and English records, seller workflows, proof, and customer trust.",
      ar: "إرشادات تشغيل الضمانات للشركات في السعودية والخليج التي تحتاج إلى سجلات عربية وإنجليزية وسير بائعين وإثبات وثقة عملاء.",
    },
    eyebrow: { en: "Saudi and GCC operations", ar: "تشغيل السعودية والخليج" },
    intro: {
      en: "Warranty operations in Saudi Arabia and the GCC need clear proof, Arabic and English communication, seller accountability, and customer-facing verification. Warrantee.io is positioned around that post-purchase trust problem.",
      ar: "تحتاج عمليات الضمان في السعودية والخليج إلى إثبات واضح وتواصل عربي وإنجليزي ومساءلة البائع والتحقق الموجه للعميل. تتمحور Warrantee.io حول مشكلة الثقة بعد الشراء.",
    },
    audience: {
      en: "Best for GCC retailers, distributors, service providers, ecommerce operators, and businesses issuing warranties to Arabic and English audiences.",
      ar: "مناسب للمتاجر والموزعين ومقدمي الخدمة ومشغلي التجارة الإلكترونية والشركات التي تصدر ضمانات لجمهور عربي وإنجليزي.",
    },
    sections: [
      {
        title: { en: "Bilingual trust", ar: "الثقة ثنائية اللغة" },
        body: {
          en: "Warranty terms should be understandable to the buyer and usable by internal teams. Bilingual records reduce ambiguity when claims move between customer support, sellers, and management.",
          ar: "يجب أن تكون شروط الضمان مفهومة للمشتري وقابلة للاستخدام من الفرق الداخلية. تقلل السجلات الثنائية اللغة الغموض عندما تنتقل المطالبات بين دعم العملاء والبائعين والإدارة.",
        },
        bullets: {
          en: ["Arabic and English certificates", "Arabic and English public pages", "Locale-preserving account and verification flows"],
          ar: ["شهادات عربية وإنجليزية", "صفحات عامة عربية وإنجليزية", "مسارات حساب وتحقق تحفظ اللغة"],
        },
      },
      {
        title: { en: "Operational accountability", ar: "المساءلة التشغيلية" },
        body: {
          en: "A warranty platform should show who issued the warranty, who approved it, what changed, and what the customer can verify.",
          ar: "يجب أن تعرض منصة الضمان من أصدر الضمان ومن وافق عليه وما الذي تغير وما الذي يمكن للعميل التحقق منه.",
        },
        bullets: {
          en: ["Seller registration", "Approval history", "Customer verification and certificates"],
          ar: ["تسجيل البائع", "سجل الموافقات", "تحقق العميل والشهادات"],
        },
      },
    ],
    proof: {
      en: ["Arabic is fully indexed.", "English remains the primary source.", "GCC-focused metadata and schema are in place."],
      ar: ["العربية مفهرسة بالكامل.", "الإنجليزية تبقى المصدر الأساسي.", "بيانات وصفية وسكيما موجهة للخليج موجودة."],
    },
    faq: [
      {
        question: { en: "Is Warrantee only for Saudi Arabia?", ar: "هل Warrantee مخصصة للسعودية فقط؟" },
        answer: {
          en: "Warrantee.io is focused on Saudi Arabia and the GCC, with English and Arabic workflows designed for regional warranty operations.",
          ar: "تركز Warrantee.io على السعودية والخليج، مع مسارات عربية وإنجليزية مصممة لتشغيل الضمانات في المنطقة.",
        },
      },
    ],
    cta: {
      en: { title: "Run warranties in Arabic and English", body: "Use Warrantee for regional seller workflows, certificates, and verification.", primary: "Start free" },
      ar: { title: "شغّل الضمانات بالعربية والإنجليزية", body: "استخدم Warrantee لسير البائعين والشهادات والتحقق في المنطقة.", primary: "ابدأ مجانًا" },
    },
  },
];

export const COMPARISON_PAGES: SeoContentPage[] = [
  {
    slug: "spreadsheets",
    kind: "compare",
    title: {
      en: "Warrantee vs Spreadsheets",
      ar: "Warrantee مقابل الجداول",
    },
    description: {
      en: "Compare Warrantee with spreadsheet-based warranty tracking for proof, permissions, reminders, claims, certificates, and API / CLI / MCP integration.",
      ar: "قارن Warrantee بتتبع الضمانات عبر الجداول من حيث الإثبات والصلاحيات والتنبيهات والمطالبات والشهادات والتكامل.",
    },
    eyebrow: { en: "Comparison", ar: "مقارنة" },
    intro: {
      en: "Spreadsheets are useful for lists. Warranty operations need more than lists: permissions, evidence, reminders, public verification, certificates, customer workflows, and audit history.",
      ar: "الجداول مفيدة للقوائم. لكن تشغيل الضمان يحتاج إلى أكثر من القوائم: صلاحيات وأدلة وتنبيهات وتحقق عام وشهادات وسير عمل للعملاء وسجل تدقيق.",
    },
    audience: {
      en: "For teams deciding whether to keep warranty tracking in Excel, Google Sheets, Airtable, or move to a controlled warranty platform.",
      ar: "للفرق التي تقرر بين إبقاء تتبع الضمان في Excel أو Google Sheets أو Airtable أو الانتقال إلى منصة ضمان مضبوطة.",
    },
    sections: [
      {
        title: { en: "Where spreadsheets break", ar: "أين تفشل الجداول" },
        body: {
          en: "The problem is not the table. The problem is that warranty work needs process control around the table.",
          ar: "المشكلة ليست في الجدول نفسه. المشكلة أن عمل الضمان يحتاج إلى ضبط سير عمل حول الجدول.",
        },
        bullets: {
          en: ["No public verification page", "No claim workflow", "Weak permission and audit controls", "No certificate generation path"],
          ar: ["لا توجد صفحة تحقق عامة", "لا يوجد سير مطالبات", "ضوابط صلاحيات وتدقيق ضعيفة", "لا يوجد مسار إنشاء شهادات"],
        },
      },
      {
        title: { en: "Where Warrantee fits", ar: "أين يناسب Warrantee" },
        body: {
          en: "Warrantee turns a warranty row into a managed lifecycle: issue, approve, verify, claim, extend, and report.",
          ar: "يحوّل Warrantee صف الضمان إلى دورة حياة مدارة: إصدار، موافقة، تحقق، مطالبة، تمديد، وتقرير.",
        },
        bullets: {
          en: ["Structured records", "Role-aware workflows", "Bilingual certificates", "API / CLI / MCP-ready integrations"],
          ar: ["سجلات منظمة", "سير عمل يراعي الأدوار", "شهادات ثنائية اللغة", "تكاملات جاهزة عبر API / CLI / MCP"],
        },
      },
    ],
    proof: {
      en: ["Protected dashboards redirect unauthenticated users.", "API routes reject unauthenticated access.", "Public verification stays separate from private records."],
      ar: ["لوحات التحكم المحمية تعيد غير المسجلين.", "مسارات API ترفض الوصول غير المصادق.", "التحقق العام منفصل عن السجلات الخاصة."],
    },
    faq: [
      {
        question: { en: "Can a spreadsheet be enough?", ar: "هل يمكن أن يكون الجدول كافيًا؟" },
        answer: {
          en: "A spreadsheet can be enough for a small private list. It becomes risky when customers, sellers, claims, documents, permissions, and integrations are involved.",
          ar: "قد يكفي الجدول لقائمة خاصة صغيرة. يصبح محفوفًا بالمخاطر عندما يدخل العملاء والبائعون والمطالبات والمستندات والصلاحيات والتكاملات.",
        },
      },
    ],
    cta: {
      en: { title: "Move from rows to warranty operations", body: "Use Warrantee when the warranty record needs workflow, proof, and customer trust.", primary: "Start free" },
      ar: { title: "انتقل من الصفوف إلى تشغيل الضمان", body: "استخدم Warrantee عندما يحتاج سجل الضمان إلى سير عمل وإثبات وثقة عميل.", primary: "ابدأ مجانًا" },
    },
  },
  {
    slug: "build-with-ai",
    kind: "compare",
    title: {
      en: "Why Not Build Warranty Software With AI?",
      ar: "لماذا لا تبني برنامج ضمان بالذكاء الاصطناعي؟",
    },
    description: {
      en: "A practical comparison between building a custom AI-generated warranty tool and using Warrantee for production-ready warranty workflows.",
      ar: "مقارنة عملية بين بناء أداة ضمان مخصصة بالذكاء الاصطناعي واستخدام Warrantee لسير ضمان جاهز للإنتاج.",
    },
    eyebrow: { en: "Build vs buy", ar: "البناء أم الشراء" },
    intro: {
      en: "AI can help create a prototype quickly. The hard part is not drawing forms. The hard part is production warranty operations: authentication, company isolation, audit trails, claims, certificates, integration tokens, rate limits, payments, monitoring, and support.",
      ar: "يمكن للذكاء الاصطناعي أن يساعد في إنشاء نموذج أولي بسرعة. الصعب ليس رسم النماذج. الصعب هو تشغيل الضمان في الإنتاج: المصادقة، عزل الشركات، سجلات التدقيق، المطالبات، الشهادات، رموز التكامل، حدود الطلبات، المدفوعات، المراقبة، والدعم.",
    },
    audience: {
      en: "For founders, operators, and technical buyers considering whether to build their own warranty tracker with AI tools.",
      ar: "للمؤسسين والمشغلين والمشترين التقنيين الذين يفكرون في بناء متتبع ضمان خاص بهم بأدوات الذكاء الاصطناعي.",
    },
    sections: [
      {
        title: { en: "AI helps you start; it does not remove ownership", ar: "الذكاء الاصطناعي يساعدك على البدء ولا يلغي المسؤولية" },
        body: {
          en: "A generated app still needs someone to own security, data leaks, database constraints, RLS, billing, support, SEO, monitoring, migrations, backups, and incident response.",
          ar: "التطبيق المولد لا يزال يحتاج إلى من يملك الأمن وتسرب البيانات وقيود قاعدة البيانات وRLS والفوترة والدعم وSEO والمراقبة والترحيلات والنسخ الاحتياطي والاستجابة للحوادث.",
        },
        bullets: {
          en: ["Authentication and company isolation", "Claims and certificate integrity", "Webhook, payment, and API / CLI / MCP security", "Production monitoring and QA"],
          ar: ["المصادقة وعزل الشركات", "سلامة المطالبات والشهادات", "أمان الويب هوك والمدفوعات وAPI / CLI / MCP", "مراقبة الإنتاج وQA"],
        },
      },
      {
        title: { en: "When building is reasonable", ar: "متى يكون البناء منطقيًا" },
        body: {
          en: "Building your own can make sense if warranty workflow is your core product, you have an engineering team, and you are ready to maintain the system long-term.",
          ar: "قد يكون بناء النظام منطقيًا إذا كان سير الضمان هو منتجك الأساسي ولديك فريق هندسي ومستعد لصيانة النظام طويلًا.",
        },
        bullets: {
          en: ["You need full proprietary control", "Your workflow is deeply unique", "You can fund security, QA, and maintenance"],
          ar: ["تحتاج إلى تحكم ملكي كامل", "سير العمل لديك فريد جدًا", "يمكنك تمويل الأمن وQA والصيانة"],
        },
      },
      {
        title: { en: "When Warrantee is faster", ar: "متى يكون Warrantee أسرع" },
        body: {
          en: "Warrantee is the practical path when you need warranty operations now and want the AI-assisted custom work to focus on integrations, analytics, and sales workflows instead of rebuilding core infrastructure.",
          ar: "Warrantee هو المسار العملي عندما تحتاج إلى تشغيل الضمان الآن وتريد توجيه العمل المخصص بالذكاء الاصطناعي إلى التكاملات والتحليلات وسير المبيعات بدل إعادة بناء البنية الأساسية.",
        },
        bullets: {
          en: ["Use the platform for core warranty lifecycle", "Use AI for workflows around the platform", "Reduce launch and security risk"],
          ar: ["استخدم المنصة لدورة حياة الضمان الأساسية", "استخدم الذكاء الاصطناعي لسير العمل حول المنصة", "قلل مخاطر الإطلاق والأمان"],
        },
      },
    ],
    proof: {
      en: ["Production checks cover auth boundaries and protected APIs.", "Stripe, OCR, and webhook readiness are monitored.", "Public API / CLI / MCP documentation and verification flows already exist."],
      ar: ["فحوص الإنتاج تغطي حدود المصادقة وواجهات API المحمية.", "تتم مراقبة جاهزية Stripe وOCR والويب هوك.", "وثائق API / CLI / MCP العامة ومسارات التحقق موجودة بالفعل."],
    },
    faq: [
      {
        question: { en: "Can AI build a warranty app?", ar: "هل يستطيع الذكاء الاصطناعي بناء تطبيق ضمان؟" },
        answer: {
          en: "AI can help build a prototype. A production warranty platform still needs security boundaries, data ownership, QA, integrations, monitoring, and support.",
          ar: "يمكن للذكاء الاصطناعي المساعدة في بناء نموذج أولي. منصة الضمان الإنتاجية لا تزال تحتاج إلى حدود أمان وملكية بيانات وQA وتكاملات ومراقبة ودعم.",
        },
      },
      {
        question: { en: "Should I build or use Warrantee?", ar: "هل أبني أم أستخدم Warrantee؟" },
        answer: {
          en: "Build if warranty workflow is your proprietary core and you have long-term engineering ownership. Use Warrantee if you want a faster, safer operating layer.",
          ar: "ابنِ إذا كان سير الضمان جوهرًا ملكيًا لديك ولديك ملكية هندسية طويلة الأجل. استخدم Warrantee إذا أردت طبقة تشغيل أسرع وأكثر أمانًا.",
        },
      },
    ],
    cta: {
      en: { title: "Use AI where it gives leverage", body: "Let Warrantee handle the warranty operating layer, then use AI to tailor reporting, integrations, and workflows.", primary: "Start with Warrantee" },
      ar: { title: "استخدم الذكاء الاصطناعي حيث يعطيك قوة", body: "دع Warrantee يتولى طبقة تشغيل الضمان، ثم استخدم الذكاء الاصطناعي لتخصيص التقارير والتكاملات وسير العمل.", primary: "ابدأ مع Warrantee" },
    },
  },
];

export const SEO_CONTENT_PAGES = [...RESOURCE_PAGES, ...COMPARISON_PAGES] as const;

export function getSeoContentPage(kind: SeoPageKind, slug: string) {
  return SEO_CONTENT_PAGES.find((page) => page.kind === kind && page.slug === slug);
}

export function getSeoContentLocale(locale: string) {
  return getContentLocale(locale);
}

export function buildSeoPagePath(kind: SeoPageKind, slug: string) {
  return kind === "resource" ? `/resources/${slug}` : `/compare/${slug}`;
}

export function shouldNoindexSeoPage(locale: string) {
  return !isIndexedLocale(locale);
}
