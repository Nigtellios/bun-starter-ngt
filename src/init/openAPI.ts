import { OpenAPIHono } from "@hono/zod-openapi";
import RuntimeConfig from "config/runtimeConfig.ts";
import { mountOpenAPI } from "../api";
import { logger } from "../common";

const openAPI = new OpenAPIHono();

const isDevelopment = RuntimeConfig.MODE === "development";

logger.info(`Mounting OpenAPI routes; docs enabled: ${isDevelopment}`);
logger.info(`Application running in ${RuntimeConfig.MODE} mode!`);

mountOpenAPI(openAPI, {
  enableDocs: isDevelopment,
  servers: RuntimeConfig.PUBLIC_BASE_URL
    ? [
        {
          url: RuntimeConfig.PUBLIC_BASE_URL,
        },
      ]
    : undefined,
});

export default openAPI;
