import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import { logger } from "../index.ts";

export type RequestErrorEnv = {
  Variables: {
    requestError?: Error;
  };
};

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === "string") {
    return new Error(error);
  }

  return new Error("Unknown error");
};

const handleErrors = (app: Hono<RequestErrorEnv>) => {
  app.notFound((context) => {
    const notFoundError = new Error("Route not found");
    notFoundError.name = "NotFoundError";

    context.set("requestError", notFoundError);

    logger.warn(
      {
        err: notFoundError,
        method: context.req.method,
        path: context.req.path,
        statusCode: StatusCodes.NOT_FOUND,
      },
      "Unhandled request",
    );

    return context.json(
      {
        message: "Not Found",
      },
      StatusCodes.NOT_FOUND,
    );
  });

  app.onError((error, context) => {
    const normalizedError = toError(error);
    context.set("requestError", normalizedError);

    if (error instanceof HTTPException) {
      logger.error(
        {
          err: normalizedError,
          method: context.req.method,
          path: context.req.path,
          statusCode: error.status,
        },
        "Request failed",
      );

      return error.getResponse();
    }

    logger.error(
      {
        err: normalizedError,
        method: context.req.method,
        path: context.req.path,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      },
      "Unhandled request error",
    );

    return context.json(
      {
        message: "Internal Server Error",
      },
      StatusCodes.INTERNAL_SERVER_ERROR,
    );
  });
};

export default handleErrors;
