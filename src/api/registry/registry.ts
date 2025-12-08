import { swaggerUI } from "@hono/swagger-ui";
import type { OpenAPIHono } from "@hono/zod-openapi";
import GlobalAppConfig from "config/globalConfig.ts";
import type { RouteHandler, RouteSpec } from "./registry.type.ts";
export const registry: Array<readonly [RouteSpec, RouteHandler]> = [];

/**
 * Register an OpenAPI-aware route definition so it can be mounted later.
 */
export const registerRoute = (spec: RouteSpec, handler: RouteHandler) => {
  registry.push([spec, handler]);
};

/**
 * Mount every registered route onto the provided OpenAPI-aware router.
 */
export const applyRegisteredRoutes = (openApiApp: OpenAPIHono) => {
  for (const [spec, handler] of registry) {
    openApiApp.openapi(spec, handler);
  }
};

export const mountOpenAPI = (
  openApiApp: OpenAPIHono,
  {
    docsPath = GlobalAppConfig.OPENAPI_JSON_PATH,
    swaggerPath = GlobalAppConfig.SWAGGER_UI_PATH,
    enableDocs = true,
  }: {
    docsPath?: string;
    swaggerPath?: string;
    enableDocs?: boolean;
  } = {},
) => {
  applyRegisteredRoutes(openApiApp);

  if (!enableDocs) {
    return;
  }

  openApiApp.doc(docsPath, {
    info: {
      title: GlobalAppConfig.OPENAPI_DOCS_NAME,
      version: GlobalAppConfig.OPENAPI_CURRENT_VERSION,
    },
    openapi: GlobalAppConfig.OPENAPI_TARGET_VERSION,
  });

  openApiApp.get(
    swaggerPath,
    swaggerUI({
      url: docsPath,
    }),
  );
};
