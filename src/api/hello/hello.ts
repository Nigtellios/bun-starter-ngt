import { createRoute, z } from "@hono/zod-openapi";
import { HTTPRequestMethods } from "../../common/types/HTTPRequestMethods.ts";
import { registerRoute } from "../registry/registry.ts";

registerRoute(
  createRoute({
    method: HTTPRequestMethods.GET,
    path: "/hello",
    responses: {
      200: {
        description: "Respond a message",
        content: {
          "application/json": {
            schema: z.object({
              message: z.string(),
            }),
          },
        },
      },
    },
  }),
  (context) => context.json({ message: "hello" }),
);
