export type UntrustedContentCategory =
  | "none"
  | "prompt_injection"
  | "instruction_extraction"
  | "credential_exfiltration"
  | "authorization_spoofing"
  | "consequential_action";

export type UntrustedContentAssessment = {
  blocked: boolean;
  category: UntrustedContentCategory;
};

const CATEGORY_PATTERNS: Array<{
  category: Exclude<UntrustedContentCategory, "none">;
  patterns: RegExp[];
}> = [
  {
    category: "prompt_injection",
    patterns: [
      /ignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|system|developer|hidden)\s+(?:(?:system|developer|hidden)\s+)?(?:instructions?|prompts?|rules?)/i,
      /(?:system|developer)\s+(?:message|prompt|instructions?)\s*:/i,
      /(?:override|bypass|disregard)\s+(?:the\s+)?(?:policy|policies|guardrails?|instructions?|safety)/i,
      /تجاهل\s+(?:كل\s+)?(?:التعليمات|الأوامر|السياسات)(?:\s+السابقة)?/i,
      /تجاوز\s+(?:الحماية|السياسات|التعليمات)/i,
    ],
  },
  {
    category: "instruction_extraction",
    patterns: [
      /(?:reveal|repeat|print|display|show|dump|extract)\s+(?:(?:me\s+)?(?:your\s+|the\s+)?)?(?:(?:system|developer|hidden|internal)\s+){1,3}(?:prompt|message|instructions?)/i,
      /(?:what|which)\s+(?:are|were)\s+your\s+(?:hidden|system|developer|internal)\s+(?:instructions?|rules?|prompt)/i,
      /(?:اكشف|اعرض|اطبع|كرر)\s+(?:التعليمات|الأوامر|النص)\s+(?:الداخلية|المخفية|النظامية)/i,
    ],
  },
  {
    category: "credential_exfiltration",
    patterns: [
      /(?:reveal|show|print|dump|send|return|expose)\s+(?:me\s+)?(?:the\s+)?(?:api\s*)?(?:secret|password|credential|private\s+key|access\s+token|service\s+role\s+key)/i,
      /(?:read|list|return)\s+(?:the\s+)?(?:environment|env)\s+(?:variables?|secrets?)/i,
      /(?:اكشف|اعرض|أرسل|اطبع)\s+(?:كلمة\s+المرور|المفتاح\s+الخاص|رمز\s+الوصول|الأسرار|بيانات\s+الدخول)/i,
    ],
  },
  {
    category: "authorization_spoofing",
    patterns: [
      /(?:the\s+)?(?:owner|admin|administrator|developer|system)\s+(?:already\s+)?(?:approved|authorized|permitted|told\s+you)/i,
      /(?:approval|authorization)\s+(?:is|was|has\s+been)\s+(?:granted|confirmed|given)/i,
      /(?:المالك|المشرف|المدير|النظام)\s+(?:وافق|صرح|أذن)/i,
      /(?:تمت|تم)\s+(?:الموافقة|التصريح|الإذن)/i,
    ],
  },
  {
    category: "consequential_action",
    patterns: [
      /(?:do|execute|perform|submit|send|contact|purchase|pay|approve|delete|create|update|change)\s+(?:it|this|that|the\s+form|the\s+payment|the\s+record|the\s+account|the\s+configuration)\s+(?:now|for\s+me|on\s+my\s+behalf)/i,
      /(?:use|run)\s+(?:your\s+)?(?:tools?|credentials?|access)\s+to\s+(?:send|submit|purchase|pay|approve|delete|create|update|change)/i,
      /(?:نفذ|أرسل|قدم|ادفع|وافق|احذف|أنشئ|غيّر)\s+(?:الآن|نيابة\s+عني|بالنيابة\s+عني)/i,
    ],
  },
];

export function assessUntrustedContent(value: unknown): UntrustedContentAssessment {
  const text = typeof value === "string" ? value.slice(0, 20_000) : "";
  for (const entry of CATEGORY_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(text))) {
      return { blocked: true, category: entry.category };
    }
  }
  return { blocked: false, category: "none" };
}

export function isInstructionAttack(assessment: UntrustedContentAssessment) {
  return assessment.blocked && assessment.category !== "consequential_action";
}
