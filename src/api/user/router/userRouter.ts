import { createRoute, z } from "@hono/zod-openapi";
import { GetUserSchema, UserSchema } from "@api/user/model/userModel.ts";
import { userController } from "@api/user/userController.ts";
import { ServiceResponseSchema } from "@common/models/serviceResponse.ts";
import { HTTPRequestMethods } from "@common/types/HTTPRequestMethods.ts";
import { validateRequest } from "@common/handlers/httpHandlers.ts";
import { registerRoute } from "@api/registry/registry.ts";

// GET /users - Get all users
registerRoute(
  createRoute({
    method: HTTPRequestMethods.GET,
    path: "/users",
    tags: ["User"],
    summary: "Get all users",
    responses: {
      200: {
        description: "List of users",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.array(UserSchema)),
          },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.null()),
          },
        },
      },
    },
  }),
  userController.getUsers,
);

// GET /users/:id - Get user by ID
registerRoute(
  createRoute({
    method: HTTPRequestMethods.GET,
    path: "/users/{id}",
    tags: ["User"],
    summary: "Get user by ID",
    request: {
      params: GetUserSchema.shape.params,
    },
    responses: {
      200: {
        description: "User found",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(UserSchema),
          },
        },
      },
      404: {
        description: "User not found",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.null()),
          },
        },
      },
      400: {
        description: "Invalid request parameters",
        content: {
          "application/json": {
            schema: ServiceResponseSchema(z.null()),
          },
        },
      },
    },
    middleware: [validateRequest(GetUserSchema)] as any,
  }),
  userController.getUser,
);
