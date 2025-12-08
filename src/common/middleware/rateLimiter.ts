// https://github.com/rhinobase/hono-rate-limiter

import { rateLimiter } from "hono-rate-limiter";

const rateLimiterMiddleware = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 250, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
  standardHeaders: "draft-6", // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  keyGenerator: (context) => "<unique_key>", // Method to generate custom identifiers for clients.
  // store: ... , // Redis, MemoryStore, etc. See below.
});

export default rateLimiterMiddleware;
