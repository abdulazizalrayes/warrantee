export type RedactedAgentQuestion = {
  text: string;
  redactionApplied: boolean;
};

const REDACTIONS: Array<[RegExp, string]> = [
  [/\b(?:bearer\s+)?eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/gi, "[token]"],
  [/\b(?:wrt_|sk_|pk_|api[_-]?key[_-]?)[A-Za-z0-9._-]{8,}\b/gi, "[credential]"],
  [/(?:password|passwd|secret|token|api[_ -]?key)\s*[:=]\s*\S+/gi, "[credential]"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[email]"],
  [/https?:\/\/[^\s)\]}]+/gi, "[url]"],
  [/\b(?:\d[ -]*?){13,19}\b/g, "[number]"],
  [/\b(?:\+?\d[\d ()-]{7,}\d)\b/g, "[phone]"],
  [/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, "[ip]"],
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "[identifier]"],
  [/(?:warranty|claim|serial|reference|account|ضمان|مطالبة|تسلسلي|مرجع)\s*(?:id|number|no\.?|رقم)?\s*[:#=-]\s*[A-Za-z0-9_-]{4,}/gi, "[record-reference]"],
];

export function redactAgentQuestion(input: string, maxLength = 1000): RedactedAgentQuestion {
  let text = input
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/<[^>]{1,200}>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  const original = text;

  for (const [pattern, replacement] of REDACTIONS) {
    text = text.replace(pattern, replacement);
  }

  text = text.replace(/\s+/g, " ").trim().slice(0, maxLength);
  return {
    text: text || "[redacted-question]",
    redactionApplied: text !== original,
  };
}
