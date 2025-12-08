import { OpenAPIHono } from "@hono/zod-openapi";
import { mountOpenAPI } from "../api";
import { logger } from "../common";
import RuntimeConfig from "config/runtimeConfig.ts";

const openAPI = new OpenAPIHono();

const isDevelopment = RuntimeConfig.MODE === "development";

logger.info(`Mounting OpenAPI routes; docs enabled: ${isDevelopment}`);
logger.info(`Application running in ${RuntimeConfig.MODE} mode!`);

mountOpenAPI(openAPI, {
	enableDocs: isDevelopment,
});

export default openAPI;
