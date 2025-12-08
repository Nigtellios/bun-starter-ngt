import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";

const openAPIApp = new OpenAPIHono();

openAPIApp.openapi(
  createRoute({
    method: 'get',
    path: '/hello',
    responses: {
      200: {
        description: 'Respond a message',
        content: {
          'application/json': {
            schema: z.object({
              message: z.string(),
            }),
          },
        },
      },
    },
  }),
  (c) => {
    return c.json({
      message: 'hello',
    })
  }
)

openAPIApp.get(
  '/swagger-ui',
  swaggerUI({
    url: '/docs',
  })
)

openAPIApp.doc('/docs', {
  info: {
    title: 'An API',
    version: 'v1',
  },
  openapi: '3.1.0',
})

export default openAPIApp;