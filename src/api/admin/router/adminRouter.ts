import adminGuard from "@common/middleware/adminGuard.ts";
import { ServiceResponse, ServiceResponseSchema } from "@common/models/serviceResponse.ts";
import { HTTPRequestMethods } from "@common/types/HTTPRequestMethods.ts";
import { registerRoute } from "@common/apiRegistry/registry";
import { handleServiceResponse } from "@common/handlers/httpHandlers.ts";
import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";

registerRoute(
  createRoute({
    method: HTTPRequestMethods.GET,
    path: "/admin/health",
    tags: ["Admin"],
    summary: "Admin health check (protected)",
    responses: {
      200: {
        description: "Admin API is healthy",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.null()),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.null()),
          },
        },
      },
      403: {
        description: "Forbidden",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.null()),
          },
        },
      },
    },
    middleware: [adminGuard] as any,
  }),
  (context) => {
    const serviceResponse = ServiceResponse.success<null>("Admin API is healthy", null, StatusCodes.OK);
    return handleServiceResponse(serviceResponse, context);
  },
);

