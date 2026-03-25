// @ts-nocheck
// Simple in-memory rate limiter for API routes
// For production, consider using Redis-based solutions

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number;    // Max requests per window
  windowMs: number;       // Time window in milliseconds
  identifier?: string;    // Optional prefix for the key
}

export function rateLimit(
  ip: string,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60 * 1000 }
): { success: boolean; remaining: number; resetIn: number } {
  const key = (config.identifier || "global") + ":" + ip;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return { success: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetIn: entry.resetTime - now };
  }

  entry.count++;
  return { success: true, remaining: config.maxRequests - entry.count, resetIn: entry.resetTime - now };
}

export function getRateLimitHeaders(result: { remaining: number; resetIn: number }) {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": Math.ceil(result.resetIn / 1000).toString(),
  };
}

// Pre-configured rate limiters
export const apiRateLimit = (ip: string) => rateLimit(ip, { maxRequests: 60, windowMs: 60000, identifier: "api" });
export const authRateLimit = (ip: string) => rateLimit(ip, { maxRequests: 10, windowMs: 60000, identifier: "auth" });
export const webhookRateLimit = (ip: string) => rateLimit(ip, { maxRequests: 100, windowMs: 60000, identifier: "webhook" });
