import { Hono } from "hono";
import { RegExpRouter } from "hono/router/reg-exp-router";
import { SmartRouter } from "hono/router/smart-router";
import { TrieRouter } from "hono/router/trie-router";
import { logger } from "../common";
import openAPI from "./openAPI";
import rateLimiterMiddleware from "@common/middleware/rateLimiter.ts";

/**
 * Hono
 * Hono docs: https://hono.dev/docs/getting-started/bun
 */
const app = new Hono({
  router: new SmartRouter({
    routers: [new RegExpRouter(), new TrieRouter()],
  }),
});

// Use Rate Limiter Middleware globally for all routes
app.use(rateLimiterMiddleware);

logger.info("Initialized Hono app with SmartRouter (RegExpRouter + TrieRouter)");

app.get("/", (context) => context.text("Bun!"));

// Mount OpenAPI router so the generated spec and Swagger UI stay in sync.
app.route("/", openAPI);

export default app;
