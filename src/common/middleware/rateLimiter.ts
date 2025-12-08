// https://github.com/rhinobase/hono-rate-limiter

import { rateLimiter } from "hono-rate-limiter";

const rateLimiterMiddleware = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 9999, // Limit each IP to 9999 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: (context) => {
    // Rate limit per client IP address
    // This ensures each user has their own rate limit counter
    const ip =
      context.req.header("x-forwarded-for")?.split(",")[0]?.trim() || context.req.header("x-real-ip") || "unknown";
    return ip;
  },
  // store: ... , // For production with multiple servers, use Redis store for shared state
});

export default rateLimiterMiddleware;
