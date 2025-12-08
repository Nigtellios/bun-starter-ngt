import { createRoute, z } from "@hono/zod-openapi";
import { StatusCodes } from "http-status-codes";
import { registerRoute } from "../../common/apiRegistry/registry.ts";
import { handleServiceResponse } from "../../common/handlers/httpHandlers.ts";
import { ServiceResponse, ServiceResponseSchema } from "../../common/models/serviceResponse.ts";
import { HTTPRequestMethods } from "../../common/types/HTTPRequestMethods.ts";

registerRoute(
  createRoute({
    method: HTTPRequestMethods.GET,
    path: "/health-check",
    tags: ["Health Check"],
    summary: "Verify the service is running",
    responses: {
      200: {
        description: "Service is healthy",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.null()),
          },
        },
      },
    },
  }),
  (context) => {
    const serviceResponse = ServiceResponse.success<null>("Service is healthy", null, StatusCodes.OK);
    return handleServiceResponse(serviceResponse, context);
  },
);
