export type TrafficClass = "human" | "crawler" | "qa" | "monitoring";

const CRAWLER_USER_AGENT =
  /(?:bot\b|crawler\b|spider\b|slurp\b|bingpreview\b|google-inspectiontool\b|googleother\b|chatgpt-user\b|claude-web\b|facebookexternalhit\b)/i;

const QA_USER_AGENT =
  /\b(?:warrantee-qa|playwright|headlesschrome|webdriver)\b/i;

const MONITORING_USER_AGENT =
  /\b(?:warrantee-(?:agent-readiness-check|production-load-check|production-smoke|operational-readiness)|curl|wget|undici|node-fetch|vercel-cron)\b/i;

export function classifyTrafficUserAgent(userAgent: string | null | undefined): TrafficClass {
  const normalized = userAgent?.trim() || "";

  if (QA_USER_AGENT.test(normalized)) return "qa";
  if (MONITORING_USER_AGENT.test(normalized)) return "monitoring";
  if (CRAWLER_USER_AGENT.test(normalized)) return "crawler";
  return "human";
}

export function getBrowserTrafficClass(): TrafficClass {
  if (typeof navigator === "undefined") return "human";
  if (navigator.webdriver) return "qa";
  return classifyTrafficUserAgent(navigator.userAgent);
}
