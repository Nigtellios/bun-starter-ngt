import { createRoute, z } from "@hono/zod-openapi";
import { ServiceResponse, ServiceResponseSchema } from "../../common/models/serviceResponse.ts";
import { handleServiceResponse } from "../../common/handlers/httpHandlers.ts";
import { HTTPRequestMethods } from "../../common/types/HTTPRequestMethods.ts";
import { registerRoute } from "../registry/registry.ts";
import { StatusCodes } from "http-status-codes";

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