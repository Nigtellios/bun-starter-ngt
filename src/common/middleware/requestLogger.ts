import { randomUUID } from "node:crypto";
import RuntimeConfig from "config/runtimeConfig.ts";
import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";
import { logger } from "../index.ts";
import type { RequestErrorEnv } from "./errorHandler.ts";

type LogLevel = "info" | "warn" | "error";

type RequestLogEntry = {
  requestId: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  err?: Error;
  responseBody?: unknown;
};

const determineLogLevel = (statusCode: number): LogLevel | undefined => {
  if (statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) {
    return "error";
  }

  if (statusCode >= StatusCodes.BAD_REQUEST) {
    return "warn";
  }

  if (statusCode >= StatusCodes.MULTIPLE_CHOICES) {
    return undefined;
  }

  return "info";
};

const captureResponseBody = async (response: Response): Promise<unknown> => {
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

const requestLogger = createMiddleware<RequestErrorEnv>(async (context, next) => {
  const requestId = context.req.header("x-request-id") ?? randomUUID();
  const requestStart = Date.now();

  context.set("requestId", requestId);
  context.set("requestStart", requestStart);
  context.header("X-Request-Id", requestId);

  if (RuntimeConfig.LOG_REQUESTS) {
    logger.debug(
      {
        requestId,
        method: context.req.method,
        path: context.req.path,
      },
      "Request received",
    );
  }

  await next();

  context.header("X-Request-Id", requestId);

  if (!RuntimeConfig.LOG_REQUESTS) {
    return;
  }

  const response = context.res;

  if (!response) {
    logger.warn(
      {
        requestId,
        method: context.req.method,
        path: context.req.path,
      },
      "Request completed without response",
    );
    return;
  }

  const statusCode = response.status ?? StatusCodes.OK;
  const level = determineLogLevel(statusCode);

  if (!level) {
    return;
  }

  const requestStartedAt = context.get("requestStart");
  const durationMs = typeof requestStartedAt === "number" ? Math.max(Date.now() - requestStartedAt, 0) : 0;
  const requestError = context.get("requestError");

  const logEntry: RequestLogEntry = {
    requestId,
    method: context.req.method,
    path: context.req.path,
    statusCode,
    durationMs,
  };

  if (requestError instanceof Error) {
    logEntry.err = requestError;
  }

  if (RuntimeConfig.LOG_RESPONSES) {
    const responseBody = await captureResponseBody(response);

    if (responseBody !== undefined) {
      logEntry.responseBody = responseBody;
    }
  }

  if (level === "error") {
    logger.error(logEntry, "Request completed with server error");
    return;
  }

  if (level === "warn") {
    logger.warn(logEntry, "Request completed with client error");
    return;
  }

  logger.info(logEntry, "Request completed");
});

export default requestLogger;
