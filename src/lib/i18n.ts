export type Locale = "en" | "ar";

export const LOCALES: Locale[] = ["en", "ar"];
export const DEFAULT_LOCALE: Locale = "en";

export const DIRECTION: Record<Locale, "ltr" | "rtl"> = {
  en: "ltr",
  ar: "rtl",
};

export interface Dictionary {
  nav: {
    home: string;
    features: string;
    pricing: string;
    login: string;
    signup: string;
    dashboard: string;
    warranties: string;
    contact: string;
  };
  hero: {
    title: string;
    subtitle: string;
    cta_demo: string;
    cta_start: string;
  };
  features: {
    title: string;
    items: Array<{
      id: string;
      title: string;
      description: string;
    }>;
  };
  how_it_works: {
    title: string;
    steps: Array<{
      id: string;
      title: string;
      description: string;
    }>;
  };
  pricing: {
    title: string;
    subtitle: string;
    plans: Array<{
      id: string;
      name: string;
      price: string;
      description: string;
      features: string[];
      cta: string;
    }>;
  };
  footer: {
    company: string;
    product: string;
    legal: string;
    contact: string;
  };
  auth: {
    login: string;
    signup: string;
    magic_link: string;
    google: string;
    apple: string;
    password: string;
    email: string;
    remember_me: string;
    forgot_password: string;
    sign_in: string;
    create_account: string;
    no_account: string;
    have_account: string;
  };
  dashboard: {
    welcome: string;
    active_warranties: string;
    expiring_soon: string;
    pending_approval: string;
    recent_activity: string;
    view_all: string;
    create_new: string;
    total_managed: string;
    this_month: string;
  };
  warranty: {
    create: string;
    status: {
      draft: string;
      pending: string;
      active: string;
      claimed: string;
      expired: string;
      cancelled: string;
    };
    fields: {
      product_name: string;
      serial_number: string;
      purchase_date: string;
      warranty_end_date: string;
      coverage_type: string;
      coverage_amount: string;
      covered_items: string;
      terms_conditions: string;
      start_date: string;
      customer_name: string;
      customer_email: string;
    };
    actions: {
      approve: string;
      reject: string;
      claim: string;
      extend: string;
      cancel: string;
      download: string;
      share: string;
      edit: string;
      delete: string;
    };
  };
  common: {
    loading: string;
    error: string;
    success: string;
    cancel: string;
    save: string;
    delete: string;
    edit: string;
    back: string;
    next: string;
    previous: string;
    more_info: string;
    help: string;
    settings: string;
    logout: string;
    language: string;
    english: string;
    arabic: string;
  };
}

const dictionaries: Record<Locale, Dictionary> = {
  en: {
    nav: {
      home: "Home",
      features: "Features",
      pricing: "Pricing",
      login: "Login",
      signup: "Sign Up",
      dashboard: "Dashboard",
      warranties: "Warranties",
      contact: "Contact",
    },
    hero: {
      title: "Trust the Terms. Track Every Warranty.",
      subtitle:
        "Warrantee is the warranty management platform built for businesses. Approve, track, and claim warranties with confidence.",
      cta_demo: "Request a Demo",
      cta_start: "Get Started Free",
    },
    features: {
      title: "Everything You Need to Manage Warranties",
      items: [
        {
          id: "approval_workflow",
          title: "Smart Approval Workflow",
          description:
            "Set custom approval rules, route warranties to the right teams, and automate multi-level approvals.",
        },
        {
          id: "expiry_reminders",
          title: "Expiry Reminders",
          description:
            "Never miss a warranty deadline. Get proactive alerts for upcoming expirations and critical dates.",
        },
        {
          id: "bilingual_certs",
          title: "Bilingual Certificates",
          description:
            "Generate professional warranty certificates in Arabic and English. Fully customizable with your branding.",
        },
        {
          id: "dashboard",
          title: "Real-Time Dashboard",
          description:
            "View all warranties at a glance. Track status, expiration dates, and claim history in one central hub.",
        },
        {
          id: "email_to_warranty",
          title: "Email-to-Warranty",
          description:
            "Forward emails to create warranty records automatically. Supporting documents included instantly.",
        },
        {
          id: "chain_tracking",
          title: "Chain Tracking",
          description:
            "Track warranty chains and transfers. Maintain complete audit trails of ownership and approvals.",
        },
      ],
    },
    how_it_works: {
      title: "How Warrantee Works",
      steps: [
        {
          id: "register",
          title: "Register Your Company",
          description: "Sign up and set up your company profile in minutes.",
        },
        {
          id: "create_warranty",
          title: "Create Warranties",
          description:
            "Add warranties manually or via email. Attach original documents automatically.",
        },
        {
          id: "approve",
          title: "Approve & Track",
          description:
            "Route to approvers, collect signatures, and activate warranties instantly.",
        },
        {
          id: "track",
          title: "Monitor & Claim",
          description: "Track status in real-time and process claims with full documentation.",
        },
      ],
    },
    pricing: {
      title: "Simple, Transparent Pricing",
      subtitle: "Start free. Scale as you grow.",
      plans: [
        {
          id: "free",
          name: "Free",
          price: "$0",
          description: "Perfect for getting started",
          features: [
            "Up to 10 warranties",
            "Basic dashboard",
            "Email support",
            "Single user account",
            "30-day history",
          ],
          cta: "Get Started Free",
        },
        {
          id: "pro",
          name: "Professional",
          price: "$99",
          description: "For growing teams",
          features: [
            "Unlimited warranties",
            "Advanced dashboard & analytics",
            "Priority email & chat support",
            "Up to 5 team members",
            "12-month history",
            "Custom approval workflows",
            "Bilingual certificates",
          ],
          cta: "Start Free Trial",
        },
        {
          id: "enterprise",
          name: "Enterprise",
          price: "Custom",
          description: "For large organizations",
          features: [
            "Everything in Professional",
            "Unlimited team members",
            "Dedicated account manager",
            "Custom integrations",
            "Advanced security & SSO",
            "Unlimited history",
            "SLA guarantee",
          ],
          cta: "Contact Sales",
        },
      ],
    },
    footer: {
      company: "Company",
      product: "Product",
      legal: "Legal",
      contact: "Contact",
    },
    auth: {
      login: "Log In",
      signup: "Sign Up",
      magic_link: "Send Magic Link",
      google: "Continue with Google",
      apple: "Continue with Apple",
      password: "Password",
      email: "Email Address",
      remember_me: "Remember me",
      forgot_password: "Forgot your password?",
      sign_in: "Sign In",
      create_account: "Create Account",
      no_account: "Don't have an account?",
      have_account: "Already have an account?",
    },
    dashboard: {
      welcome: "Welcome back",
      active_warranties: "Active Warranties",
      expiring_soon: "Expiring Soon",
      pending_approval: "Pending Approval",
      recent_activity: "Recent Activity",
      view_all: "View All",
      create_new: "Create New",
      total_managed: "Total Warranties Managed",
      this_month: "This Month",
    },
    warranty: {
      create: "Create Warranty",
      status: {
        draft: "Draft",
        pending: "Pending Approval",
        active: "Active",
        claimed: "Claimed",
        expired: "Expired",
        cancelled: "Cancelled",
      },
      fields: {
        product_name: "Product Name",
        serial_number: "Serial Number",
        purchase_date: "Purchase Date",
        warranty_end_date: "Warranty End Date",
        coverage_type: "Coverage Type",
        coverage_amount: "Coverage Amount",
        covered_items: "Covered Items",
        terms_conditions: "Terms & Conditions",
        start_date: "Start Date",
        customer_name: "Customer Name",
        customer_email: "Customer Email",
      },
      actions: {
        approve: "Approve",
        reject: "Reject",
        claim: "Claim Warranty",
        extend: "Extend Warranty",
        cancel: "Cancel",
        download: "Download",
        share: "Share",
        edit: "Edit",
        delete: "Delete",
      },
    },
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      cancel: "Cancel",
      save: "Save",
      delete: "Delete",
      edit: "Edit",
      back: "Back",
      next: "Next",
      previous: "Previous",
      more_info: "More Information",
      help: "Help",
      settings: "Settings",
      logout: "Log Out",
      language: "Language",
      english: "English",
      arabic: "العربية",
    },
  },
  ar: {
    nav: {
      home: "الرئيسية",
      features: "المزايا",
      pricing: "الأسعار",
      login: "تسجيل الدخول",
      signup: "إنشاء حساب",
      dashboard: "لوحة التحكم",
      warranties: "الضمانات",
      contact: "اتصل بنا",
    },
    hero: {
      title: "ثق بالشروط. تتبع كل ضمان.",
      subtitle:
        "Warrantee هو منصة إدارة الضمانات المبنية للشركات. وافق على الضمانات وتابعها واطالب بها بثقة.",
      cta_demo: "طلب عرض توضيحي",
      cta_start: "ابدأ مجاناً",
    },
    features: {
      title: "كل ما تحتاجه لإدارة الضمانات",
      items: [
        {
          id: "approval_workflow",
          title: "سير عمل الموافقة الذكي",
          description:
            "قم بتعيين قواعد موافقة مخصصة، وجهز الضمانات للفرق المناسبة، وأتمتة الموافقات متعددة المستويات.",
        },
        {
          id: "expiry_reminders",
          title: "تنبيهات انتهاء الصلاحية",
          description:
            "لا تفوت موعد انتهاء الضمان. احصل على تنبيهات استباقية لانتهاء الصلاحية والتواريخ الحرجة.",
        },
        {
          id: "bilingual_certs",
          title: "شهادات ثنائية اللغة",
          description:
            "أنشئ شهادات ضمان احترافية باللغة العربية والإنجليزية. قابلة للتخصيص بالكامل مع علامتك التجارية.",
        },
        {
          id: "dashboard",
          title: "لوحة معلومات فورية",
          description:
            "اعرض جميع الضمانات في لمحة واحدة. تتبع الحالة وتواريخ انتهاء الصلاحية وسجل الادعاءات في مركز واحد.",
        },
        {
          id: "email_to_warranty",
          title: "البريد الإلكتروني للضمان",
          description:
            "أعد توجيه رسائل البريد الإلكتروني لإنشاء سجلات الضمان تلقائياً. يتم تضمين المستندات الداعمة على الفور.",
        },
        {
          id: "chain_tracking",
          title: "تتبع السلسلة",
          description:
            "تتبع سلاسل الضمان والتحويلات. الحفاظ على مسارات تدقيق كاملة للملكية والموافقات.",
        },
      ],
    },
    how_it_works: {
      title: "كيف يعمل Warrantee",
      steps: [
        {
          id: "register",
          title: "سجل شركتك",
          description: "قم بالتسجيل وإعداد ملف الشركة الخاص بك في دقائق.",
        },
        {
          id: "create_warranty",
          title: "إنشاء الضمانات",
          description:
            "أضف الضمانات يدويًا أو عبر البريد الإلكتروني. إرفاق المستندات الأصلية تلقائيًا.",
        },
        {
          id: "approve",
          title: "الموافقة والتتبع",
          description:
            "الطريق لتجميع الموافقات، جمع التوقيعات، وتفعيل الضمانات على الفور.",
        },
        {
          id: "track",
          title: "المراقبة والادعاء",
          description:
            "تتبع الحالة في الوقت الفعلي ومعالجة الادعاءات مع التوثيق الكامل.",
        },
      ],
    },
    pricing: {
      title: "أسعار بسيطة وشفافة",
      subtitle: "ابدأ مجاناً. توسع مع نموك.",
      plans: [
        {
          id: "free",
          name: "مجاني",
          price: "$0",
          description: "مثالي للبدء",
          features: [
            "حتى 10 ضمانات",
            "لوحة معلومات أساسية",
            "دعم البريد الإلكتروني",
            "حساب مستخدم واحد",
            "سجل 30 يوماً",
          ],
          cta: "ابدأ مجاناً",
        },
        {
          id: "pro",
          name: "احترافي",
          price: "$99",
          description: "للفرق المتنامية",
          features: [
            "ضمانات غير محدودة",
            "لوحة معلومات متقدمة وتحليلات",
            "دعم بريد إلكتروني وحوار أولوية",
            "حتى 5 أعضاء الفريق",
            "سجل 12 شهراً",
            "سير عمل موافقة مخصص",
            "شهادات ثنائية اللغة",
          ],
          cta: "ابدأ المحاولة المجانية",
        },
        {
          id: "enterprise",
          name: "مؤسسي",
          price: "مخصص",
          description: "للمؤسسات الكبيرة",
          features: [
            "كل شيء احترافي",
            "أعضاء فريق غير محدودين",
            "مدير حسابات مخصص",
            "عمليات تكامل مخصصة",
            "أمان متقدم و SSO",
            "سجل غير محدود",
            "ضمان الاتفاقية على مستوى الخدمة",
          ],
          cta: "اتصل بفريق المبيعات",
        },
      ],
    },
    footer: {
      company: "الشركة",
      product: "المنتج",
      legal: "قانوني",
      contact: "اتصل",
    },
    auth: {
      login: "تسجيل الدخول",
      signup: "إنشاء حساب",
      magic_link: "إرسال رابط سحري",
      google: "المتابعة مع Google",
      apple: "المتابعة مع Apple",
      password: "كلمة المرور",
      email: "عنوان البريد الإلكتروني",
      remember_me: "تذكرني",
      forgot_password: "هل نسيت كلمة المرور؟",
      sign_in: "تسجيل الدخول",
      create_account: "إنشاء حساب",
      no_account: "ليس لديك حساب؟",
      have_account: "هل لديك حساب بالفعل؟",
    },
    dashboard: {
      welcome: "أهلا بعودتك",
      active_warranties: "الضمانات النشطة",
      expiring_soon: "تنتهي قريباً",
      pending_approval: "في انتظار الموافقة",
      recent_activity: "النشاط الأخير",
      view_all: "عرض الكل",
      create_new: "إنشاء جديد",
      total_managed: "إجمالي الضمانات المُدارة",
      this_month: "هذا الشهر",
    },
    warranty: {
      create: "إنشاء ضمان",
      status: {
        draft: "مسودة",
        pending: "في انتظار الموافقة",
        active: "نشط",
        claimed: "تم الادعاء",
        expired: "انتهت صلاحيته",
        cancelled: "تم الإلغاء",
      },
      fields: {
        product_name: "اسم المنتج",
        serial_number: "رقم سلسلة",
        purchase_date: "تاريخ الشراء",
        warranty_end_date: "تاريخ انتهاء الضمان",
        coverage_type: "نوع التغطية",
        coverage_amount: "مبلغ التغطية",
        covered_items: "العناصر المغطاة",
        terms_conditions: "الشروط والأحكام",
        start_date: "تاريخ البداية",
        customer_name: "اسم العميل",
        customer_email: "بريد العميل الإلكتروني",
      },
      actions: {
        approve: "موافقة",
        reject: "رفض",
        claim: "الادعاء بالضمان",
        extend: "تمديد الضمان",
        cancel: "إلغاء",
        download: "تحميل",
        share: "مشاركة",
        edit: "تعديل",
        delete: "حذف",
      },
    },
    common: {
      loading: "جاري التحميل...",
      error: "خطأ",
      success: "نجح",
      cancel: "إلغاء",
      save: "حفظ",
      delete: "حذف",
      edit: "تعديل",
      back: "عودة",
      next: "التالي",
      previous: "السابق",
      more_info: "معلومات أكثر",
      help: "مساعدة",
      settings: "الإعدادات",
      logout: "تسجيل الخروج",
      language: "اللغة",
      english: "English",
      arabic: "العربية",
    },
  },
};

export function getDictionary(locale: string): Dictionary {
  const normalizedLocale = (locale.toLowerCase() as Locale) || DEFAULT_LOCALE;
  return dictionaries[normalizedLocale] || dictionaries[DEFAULT_LOCALE];
}

export function isValidLocale(locale: string): locale is Locale {
  return LOCALES.includes(locale as Locale);
}
