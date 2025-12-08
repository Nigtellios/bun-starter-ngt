import { describe, expect, test, beforeEach, mock } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import errorHandlerMiddleware, { toError } from "../errorHandler.ts";
import requestLogger from "../requestLogger.ts";
import RuntimeConfig from "config/runtimeConfig.ts";

describe("toError utility", () => {
  test("should convert Error instance to Error", () => {
    const error = new Error("Test error");
    const result = toError(error);

    expect(result).toBe(error);
    expect(result.message).toBe("Test error");
  });

  test("should convert string to Error", () => {
    const result = toError("String error");

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("String error");
  });

  test("should convert unknown types to generic Error", () => {
    const result = toError({ some: "object" });

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Unknown error");
  });

  test("should convert null to generic Error", () => {
    const result = toError(null);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Unknown error");
  });

  test("should convert undefined to generic Error", () => {
    const result = toError(undefined);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Unknown error");
  });

  test("should convert number to generic Error", () => {
    const result = toError(42);

    expect(result).toBeInstanceOf(Error);
    expect(result.message).toBe("Unknown error");
  });
});

describe("errorHandlerMiddleware", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    // Add requestLogger first for request ID generation
    app.use("*", requestLogger);
    app.use("*", errorHandlerMiddleware);
  });

  describe("404 Not Found handling", () => {
    test("should return 404 for undefined routes", async () => {
      const response = await app.request("/non-existent-route");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(body).toEqual({
        message: "Not Found",
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    test("should include X-Request-Id header in 404 response", async () => {
      const response = await app.request("/non-existent-route");

      expect(response.headers.get("X-Request-Id")).toBeTruthy();
      expect(response.headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/i);
    });

    test("should preserve existing X-Request-Id from request", async () => {
      const customRequestId = "custom-request-id-123";
      const response = await app.request("/non-existent-route", {
        headers: {
          "X-Request-Id": customRequestId,
        },
      });

      expect(response.headers.get("X-Request-Id")).toBe(customRequestId);
    });
  });

  describe("HTTPException handling", () => {
    test("should handle HTTPException with custom status", async () => {
      app.get("/bad-request", (c) => {
        throw new HTTPException(StatusCodes.BAD_REQUEST, {
          message: "Invalid input",
        });
      });

      const response = await app.request("/bad-request");

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(response.headers.get("X-Request-Id")).toBeTruthy();
    });

    test("should handle HTTPException with unauthorized status", async () => {
      app.get("/unauthorized", (c) => {
        throw new HTTPException(StatusCodes.UNAUTHORIZED, {
          message: "Not authorized",
        });
      });

      const response = await app.request("/unauthorized");

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    test("should handle HTTPException with forbidden status", async () => {
      app.get("/forbidden", (c) => {
        throw new HTTPException(StatusCodes.FORBIDDEN, {
          message: "Access denied",
        });
      });

      const response = await app.request("/forbidden");

      expect(response.status).toBe(StatusCodes.FORBIDDEN);
    });

    test("should handle HTTPException with custom response body", async () => {
      app.get("/custom-error", (c) => {
        const response = new Response(
          JSON.stringify({
            error: "Custom error",
            code: "ERR_CUSTOM",
          }),
          {
            status: StatusCodes.BAD_REQUEST,
            headers: { "Content-Type": "application/json" },
          }
        );

        throw new HTTPException(StatusCodes.BAD_REQUEST, { res: response });
      });

      const response = await app.request("/custom-error");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.BAD_REQUEST);
      expect(body).toEqual({
        error: "Custom error",
        code: "ERR_CUSTOM",
      });
    });
  });

  describe("Generic error handling", () => {
    test("should handle generic Error as 500 Internal Server Error", async () => {
      app.get("/error", (c) => {
        throw new Error("Something went wrong");
      });

      const response = await app.request("/error");

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const body = await response.json();
        expect(body).toEqual({
          message: "Internal Server Error",
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        });
      }
    });

    test("should handle thrown string as 500 error", async () => {
      app.get("/string-error", (c) => {
        throw "String error message";
      });

      const response = await app.request("/string-error");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(body).toEqual({
        message: "Internal Server Error",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });

    test("should handle thrown object as 500 error", async () => {
      app.get("/object-error", (c) => {
        throw { custom: "error object" };
      });

      const response = await app.request("/object-error");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(body).toEqual({
        message: "Internal Server Error",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });

    test("should handle thrown null as 500 error", async () => {
      app.get("/null-error", (c) => {
        throw null;
      });

      const response = await app.request("/null-error");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(body).toEqual({
        message: "Internal Server Error",
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      });
    });

    test("should include X-Request-Id in error responses", async () => {
      app.get("/error", (c) => {
        throw new Error("Test error");
      });

      const response = await app.request("/error");

      expect(response.headers.get("X-Request-Id")).toBeTruthy();
    });
  });

  describe("Successful request handling", () => {
    test("should pass through successful requests", async () => {
      app.get("/success", (c) => {
        return c.json({ success: true });
      });

      const response = await app.request("/success");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.OK);
      expect(body).toEqual({ success: true });
    });

    test("should not interfere with custom status codes", async () => {
      app.get("/created", (c) => {
        return c.json({ created: true }, StatusCodes.CREATED);
      });

      const response = await app.request("/created");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.CREATED);
      expect(body).toEqual({ created: true });
    });

    test("should not interfere with custom headers", async () => {
      app.get("/custom-headers", (c) => {
        c.header("X-Custom-Header", "custom-value");
        return c.json({ success: true });
      });

      const response = await app.request("/custom-headers");

      expect(response.headers.get("X-Custom-Header")).toBe("custom-value");
    });
  });

  describe("Request ID handling", () => {
    test("should generate unique request IDs for concurrent requests", async () => {
      const responses = await Promise.all([
        app.request("/non-existent-1"),
        app.request("/non-existent-2"),
        app.request("/non-existent-3"),
      ]);

      const requestIds = responses.map((r) => r.headers.get("X-Request-Id"));

      expect(new Set(requestIds).size).toBe(3);
    });

    test("should use provided X-Request-Id from request header", async () => {
      const customId = "test-request-id-456";

      app.get("/test", (c) => {
        return c.json({ success: true });
      });

      const response = await app.request("/test", {
        headers: {
          "X-Request-Id": customId,
        },
      });

      expect(response.headers.get("X-Request-Id")).toBe(customId);
    });
  });

  describe("Edge cases", () => {
    test("should handle async errors in route handlers", async () => {
      app.get("/async-error", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        throw new Error("Async error");
      });

      const response = await app.request("/async-error");

      expect(response.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const body = await response.json();
        expect(body).toEqual({
          message: "Internal Server Error",
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        });
      }
    });

    test("should handle errors in middleware chain", async () => {
      app.use("/protected/*", async (c, next) => {
        throw new HTTPException(StatusCodes.UNAUTHORIZED, {
          message: "Not authorized",
        });
      });

      app.get("/protected/resource", (c) => {
        return c.json({ data: "secret" });
      });

      const response = await app.request("/protected/resource");

      expect(response.status).toBe(StatusCodes.UNAUTHORIZED);
    });

    test("should handle multiple error types in sequence", async () => {
      app.get("/error-1", (c) => {
        throw new Error("Error 1");
      });

      app.get("/error-2", (c) => {
        throw new HTTPException(StatusCodes.BAD_REQUEST);
      });

      const response1 = await app.request("/error-1");
      const response2 = await app.request("/error-2");

      expect(response1.status).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      expect(response2.status).toBe(StatusCodes.BAD_REQUEST);
    });

    test("should handle empty path", async () => {
      const response = await app.request("/");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(body).toEqual({
        message: "Not Found",
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    test("should handle paths with query parameters", async () => {
      const response = await app.request("/test?param=value");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(body).toEqual({
        message: "Not Found",
        statusCode: StatusCodes.NOT_FOUND,
      });
    });

    test("should handle paths with special characters", async () => {
      const response = await app.request("/test/path%20with%20spaces");
      const body = await response.json();

      expect(response.status).toBe(StatusCodes.NOT_FOUND);
      expect(body).toEqual({
        message: "Not Found",
        statusCode: StatusCodes.NOT_FOUND,
      });
    });
  });

  describe("Response body extraction", () => {
    test("should handle JSON response bodies", async () => {
      app.get("/json", (c) => {
        return c.json({ data: "test" });
      });

      const response = await app.request("/json");
      const body = await response.json();

      expect(body).toEqual({ data: "test" });
    });

    test("should handle text response bodies", async () => {
      app.get("/text", (c) => {
        return c.text("Plain text response");
      });

      const response = await app.request("/text");
      const body = await response.text();

      expect(body).toBe("Plain text response");
    });

    test("should handle HTML response bodies", async () => {
      app.get("/html", (c) => {
        return c.html("<html><body>Test</body></html>");
      });

      const response = await app.request("/html");
      const body = await response.text();

      expect(body).toBe("<html><body>Test</body></html>");
    });
  });
});
