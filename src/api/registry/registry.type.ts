import type { OpenAPIHono } from "@hono/zod-openapi";

// Reuse the OpenAPIHono.openapi signature to stay aligned with library updates.
export type RouteSpec = Parameters<OpenAPIHono["openapi"]>[0];
export type RouteHandler = Parameters<OpenAPIHono["openapi"]>[1];
