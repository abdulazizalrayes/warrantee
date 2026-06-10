// Rate limiter with Upstash Redis support + in-memory fallback
// Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel env vars

// ============================================================
// In-memory fallback (used when Redis is not configured)
// ============================================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now > entry.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  cleanupTimer.unref?.();
}

// ============================================================
// Redis-based rate limiter (Upstash)
// ============================================================
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = Boolean(REDIS_URL && REDIS_TOKEN);
const allowMemoryFallbackInProduction = process.env.RATE_LIMIT_ALLOW_MEMORY_FALLBACK === "1";
const requireRedis =
  process.env.RATE_LIMIT_REQUIRE_REDIS === "1" ||
  (process.env.NODE_ENV === "production" && !allowMemoryFallbackInProduction);

async function redisRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = `ratelimit:${key}`;

  try {
    // Use Upstash REST API directly (no extra dependency needed)
    const incrResponse = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["TTL", redisKey],
      ]),
    });

    const results = await incrResponse.json();
    const currentCount = results[0]?.result || 1;
    const ttl = results[1]?.result || -1;

    // Set expiry if this is a new key (TTL is -1 means no expiry set)
    if (ttl === -1) {
      await fetch(`${REDIS_URL}/EXPIRE/${encodeURIComponent(redisKey)}/${windowSec}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      });
    }

    const remaining = Math.max(0, maxRequests - currentCount);
    const resetIn = ttl > 0 ? ttl * 1000 : windowMs;

    return {
      success: currentCount <= maxRequests,
      remaining,
      resetIn,
    };
  } catch {
    if (requireRedis) {
      return { success: false, remaining: 0, resetIn: windowMs };
    }
    // If Redis fails outside strict production mode, fall through to in-memory.
    return memoryRateLimit(key, maxRequests, windowMs);
  }
}

// ============================================================
// In-memory rate limiter
// ============================================================
function memoryRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (entry.count >= maxRequests) {
    return { success: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return {
    success: true,
    remaining: maxRequests - entry.count,
    resetIn: entry.resetTime - now,
  };
}

// ============================================================
// Public API (same interface, auto-picks Redis or memory)
// ============================================================
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier?: string;
}

export function getClientIp(request: Request | { headers: Headers }) {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  if (cloudflareIp?.trim()) return cloudflareIp.trim();

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor?.trim()) return forwardedFor.split(",")[0].trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  return "unknown";
}

export async function rateLimit(
  ip: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60 * 1000 }
): Promise<{ success: boolean; remaining: number; resetIn: number }> {
  const key = (config.identifier || "global") + ":" + ip;

  if (useRedis) {
    return redisRateLimit(key, config.maxRequests, config.windowMs);
  }

  if (requireRedis) {
    return { success: false, remaining: 0, resetIn: config.windowMs };
  }

  return memoryRateLimit(key, config.maxRequests, config.windowMs);
}

export function getRateLimitHeaders(result: {
  remaining: number;
  resetIn: number;
}) {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetIn / 1000).toString(),
    "X-RateLimit-Backend": useRedis ? "redis" : requireRedis ? "unconfigured" : "memory",
  };
}

// Pre-configured rate limiters
export const apiRateLimit = (ip: string) =>
  rateLimit(ip, { maxRequests: 300, windowMs: 60000, identifier: "api" });
export const authRateLimit = (ip: string) =>
  rateLimit(ip, { maxRequests: 10, windowMs: 60000, identifier: "auth" });
export const webhookRateLimit = (ip: string) =>
  rateLimit(ip, { maxRequests: 120, windowMs: 60000, identifier: "webhook" });
export const contactRateLimit = (subject: string) =>
  rateLimit(subject, { maxRequests: 5, windowMs: 10 * 60000, identifier: "contact" });
export const ocrRateLimit = (subject: string) =>
  rateLimit(subject, { maxRequests: 12, windowMs: 60000, identifier: "ocr" });
export const bulkImportRateLimit = (subject: string) =>
  rateLimit(subject, { maxRequests: 6, windowMs: 10 * 60000, identifier: "bulk-import" });
export const paymentRateLimit = (subject: string) =>
  rateLimit(subject, { maxRequests: 10, windowMs: 5 * 60000, identifier: "payment" });
export const certificateRateLimit = (subject: string) =>
  rateLimit(subject, { maxRequests: 12, windowMs: 10 * 60000, identifier: "certificate" });
export const publicLookupRateLimit = (subject: string) =>
  rateLimit(subject, { maxRequests: 60, windowMs: 60000, identifier: "public-lookup" });
