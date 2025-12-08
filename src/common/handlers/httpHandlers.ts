import { StatusCodes } from "http-status-codes";
import type { Context, MiddlewareHandler } from "hono";
import type { StatusCode } from "hono/utils/http-status";
import { ZodError } from "zod";
import type { ZodType } from "zod";
import { ServiceResponse } from "@common/models/serviceResponse.ts";

/**
 * Handle a service response and send it back to the client.
 * @param serviceResponse 
 * @param context 
 * @returns 
 */
export const handleServiceResponse = (serviceResponse: ServiceResponse<any>, context: Context) => {
  context.status(serviceResponse.statusCode as StatusCode);
  return context.json(serviceResponse);
};

/**
 * Read and parse the request body based on Content-Type header.
 * @param context 
 * @returns 
 */
const readRequestBody = async (context: Context) => {
  const contentType = context.req.header("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    try {
      return await context.req.json();
    } catch {
      return undefined;
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    try {
      return await context.req.parseBody();
    } catch {
      return undefined;
    }
  }

  return undefined;
};

/**
 * Validate incoming request using the provided Zod schema.
 * The schema should validate an object with optional `body`, `query`, and `params` properties.
 * @param schema 
 * @returns 
 */
export const validateRequest = <Schema extends ZodType>(schema: Schema): MiddlewareHandler => {
  return async (context, next) => {
    try {
      const body = await readRequestBody(context);
      const query = context.req.query();
      const params = context.req.param();

      const parsed = schema.parse({ body, query, params });
      context.set("validatedRequest", parsed); // Make validated data available downstream without re-parsing the body.

      await next();
    } catch (err) {
      const message = err instanceof ZodError ? err.issues.map((issue) => issue.message).join(", ") : "Unable to process request payload";
      const errorMessage = `Invalid input: ${message}`;
      const statusCode = StatusCodes.BAD_REQUEST;
      const serviceResponse = ServiceResponse.failure(errorMessage, null, statusCode);

      return handleServiceResponse(serviceResponse, context);
    }
  };
};
