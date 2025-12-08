import { OpenAPIHono } from "@hono/zod-openapi";
import { mountOpenAPI } from "../api";
import { registry } from "../api/registry/registry.ts";
import { logger } from "../common";

const openAPI = new OpenAPIHono();

logger.info("Mounting OpenAPI routes and docs...");

mountOpenAPI(openAPI);

export default openAPI;
