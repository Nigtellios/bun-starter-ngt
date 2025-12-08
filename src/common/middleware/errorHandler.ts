import RuntimeConfig from "config/runtimeConfig.ts";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import { logger } from "../index.ts";

export type RequestErrorEnv = {
  Variables: {
    requestId?: string;
    requestStart?: number;
    requestError?: Error;
  };
};

export const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error("Unknown error");
};

const buildLogPayload = (
  context: Context<RequestErrorEnv>,
  {
    statusCode,
    error,
    responseBody,
  }: {
    statusCode: number;
    error?: Error;
    responseBody?: unknown;
  },
) => {
  const requestId = context.get("requestId");
  const requestStart = context.get("requestStart");
  const durationMs = typeof requestStart === "number" ? Math.max(Date.now() - requestStart, 0) : undefined;

  const payload: Record<string, unknown> = {
    method: context.req.method,
    path: context.req.path,
    statusCode,
  };

  if (requestId) {
    payload.requestId = requestId;
  }

  if (durationMs !== undefined) {
    payload.durationMs = durationMs;
  }

  if (error) {
    payload.err = error;
  }

  if (RuntimeConfig.LOG_RESPONSES && responseBody !== undefined) {
    payload.responseBody = responseBody;
  }

  return payload;
};

const tryExtractBody = async (response: Response): Promise<unknown> => {
  try {
    const clone = response.clone();
    const contentType = clone.headers.get("content-type")?.toLowerCase() ?? "";

    if (contentType.includes("application/json")) {
      return await clone.json();
    }

    if (contentType.startsWith("text/")) {
      return await clone.text();
    }
  } catch (_error) {
    // Ignore extraction failures; logging should never disrupt response flow.
  }

  return undefined;
};

const attachRequestIdHeader = (context: Context<RequestErrorEnv>, response: Response) => {
  const requestId = context.get("requestId");

  if (requestId) {
    response.headers.set("X-Request-Id", requestId);
  }

  return response;
};

const errorHandlerMiddleware = createMiddleware<RequestErrorEnv>(async (context, next) => {
  try {
    await next();

    if (context.finalized) {
      if (context.res?.status === StatusCodes.NOT_FOUND) {
        const notFoundError = new Error("Route not found");
        notFoundError.name = "NotFoundError";

        context.set("requestError", notFoundError);

        const responsePayload = {
          message: "Not Found",
          statusCode: StatusCodes.NOT_FOUND,
        };

        logger.warn(
          buildLogPayload(context, {
            statusCode: StatusCodes.NOT_FOUND,
            error: notFoundError,
            responseBody: responsePayload,
          }),
          "Unhandled request",
        );

        const response = attachRequestIdHeader(context, context.json(responsePayload, StatusCodes.NOT_FOUND));
        context.res = response;
        return response;
      }

      return;
    }

    const notFoundError = new Error("Route not found");
    notFoundError.name = "NotFoundError";

    context.set("requestError", notFoundError);

    const responsePayload = {
      message: "Not Found",
      statusCode: StatusCodes.NOT_FOUND,
    };

    logger.warn(
      buildLogPayload(context, {
        statusCode: StatusCodes.NOT_FOUND,
        error: notFoundError,
        responseBody: responsePayload,
      }),
      "Unhandled request",
    );

    const response = attachRequestIdHeader(context, context.json(responsePayload, StatusCodes.NOT_FOUND));
    context.res = response;
    return response;
  } catch (error) {
    const normalizedError = toError(error);
    context.set("requestError", normalizedError);

    if (error instanceof HTTPException) {
      const response = error.getResponse();

      logger.error(
        buildLogPayload(context, {
          statusCode: error.status,
          error: normalizedError,
          responseBody: RuntimeConfig.LOG_RESPONSES ? await tryExtractBody(response) : undefined,
        }),
        "Request failed",
      );

      const finalResponse = attachRequestIdHeader(context, response);
      context.res = finalResponse;
      return finalResponse;
    }

    const statusCode = StatusCodes.INTERNAL_SERVER_ERROR;
    const responsePayload = {
      message: "Internal Server Error",
      statusCode,
    };

    logger.error(
      buildLogPayload(context, {
        statusCode,
        error: normalizedError,
        responseBody: RuntimeConfig.LOG_RESPONSES ? responsePayload : undefined,
      }),
      "Unhandled request error",
    );

    const response = attachRequestIdHeader(context, context.json(responsePayload, statusCode));
    context.res = response;
    return response;
  }
});

export default errorHandlerMiddleware;
