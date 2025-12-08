import type { OpenAPIHono } from "@hono/zod-openapi";
import type { RouteSpec, RouteHandler } from "./registry.type.ts";
import { swaggerUI } from "@hono/swagger-ui";
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
    docsPath = "/docs",
    swaggerPath = "/ui",
  }: { docsPath?: string; swaggerPath?: string } = {},
) => {
  applyRegisteredRoutes(openApiApp);

  openApiApp.doc(docsPath, {
    info: { 
      title: "Bun Starter NGT - OpenAPI",
       version: "0.01" 
      },
    openapi: "3.1.0",
  });

  openApiApp.get(
    swaggerPath,
    swaggerUI({
      url: docsPath,
    }),
  );
};