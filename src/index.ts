import RuntimeConfig from "@config/runtimeConfig";
import app from "./init/app";

/**
 * This is the "core" file for app, equivalent to "server" for many other templates.
 *
 * Useful docs:
 * https://orm.drizzle.team/docs/get-started/postgresql-new
 * https://bun.com/docs/bundler
 *
 * https://hono.dev/docs/getting-started/bun
 * https://hono.dev/examples/hono-openapi
 * https://honohub.dev/docs/openapi/ui
 *
 * https://zod.dev/basics
 * https://biomejs.dev/guides/getting-started/
 *
 * https://www.npmjs.com/package/http-status-codes
 */

export default {
  port: RuntimeConfig.PORT,
  fetch: app.fetch,
};
