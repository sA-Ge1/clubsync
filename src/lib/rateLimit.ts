import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { NextResponse } from "next/server";

const redis = Redis.fromEnv();

// General API endpoints - 30 requests per minute
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:general",
});

// Auth endpoints (login, register) - stricter limit to prevent brute force
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "ratelimit:auth",
});

// Search/query endpoints - moderate limit
export const searchRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, "1 m"),
  prefix: "ratelimit:search",
});

// Write operations (create, update, delete) - lower limit
export const writeRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "ratelimit:write",
});

// Upload endpoints - very strict limit
export const uploadRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 m"),
  prefix: "ratelimit:upload",
});

// Webhook endpoints - higher limit for external services
export const webhookRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  prefix: "ratelimit:webhook",
});

type RateLimitType = "general" | "auth" | "search" | "write" | "upload" | "webhook";

const rateLimiters: Record<RateLimitType, Ratelimit> = {
  general: ratelimit,
  auth: authRatelimit,
  search: searchRatelimit,
  write: writeRatelimit,
  upload: uploadRatelimit,
  webhook: webhookRatelimit,
};

export async function withRateLimit(
  identifier: string,
  type: RateLimitType = "general"
): Promise<{ success: boolean; limit: number; remaining: number; reset: number; response?: NextResponse }> {
  const limiter = rateLimiters[type];
  const { success, limit, reset, remaining } = await limiter.limit(identifier);

  if (!success) {
    return {
      success: false,
      limit,
      remaining,
      reset,
      response: NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": reset.toString(),
          },
        }
      ),
    };
  }

  return { success: true, limit, remaining, reset };
}

// Helper to determine rate limit type based on pathname
export function getRateLimitType(pathname: string, method: string): RateLimitType {
  // Auth endpoints
  if (pathname.startsWith("/api/auth")) {
    return "auth";
  }
  
  // Upload endpoints
  if (pathname.includes("/upload") || pathname.includes("/file")) {
    return "upload";
  }
  
  // Webhook endpoints
  if (pathname.startsWith("/api/webhook")) {
    return "webhook";
  }
  
  // Search endpoints
  if (pathname.includes("/search") || pathname.includes("/query")) {
    return "search";
  }
  
  // Write operations based on HTTP method
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return "write";
  }
  
  return "general";
}
