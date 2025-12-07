import app from "./init/app";

/**
 * This is the "core" file for app, equivalent to "server" for many other templates.
 */

export default {
  port: 3137,
  fetch: app.fetch,
};
