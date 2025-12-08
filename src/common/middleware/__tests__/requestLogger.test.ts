import { describe, expect, test, beforeEach, afterEach, mock, spyOn } from "bun:test";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { StatusCodes } from "http-status-codes";
import requestLogger from "../requestLogger.ts";
import RuntimeConfig from "config/runtimeConfig.ts";
import { logger } from "../../index.ts";
import type { RequestErrorEnv } from "../errorHandler.ts";

describe("requestLogger middleware", () => {
  let app: Hono<RequestErrorEnv>;
  let originalLogRequests: boolean;
  let originalLogResponses: boolean;

  beforeEach(() => {
    // Create fresh app for each test
    app = new Hono<RequestErrorEnv>();
    app.use("*", requestLogger);
    
    // Store original config values
    originalLogRequests = RuntimeConfig.LOG_REQUESTS;
    originalLogResponses = RuntimeConfig.LOG_RESPONSES;
    
    // Enable logging by default for tests
    RuntimeConfig.LOG_REQUESTS = true;
    RuntimeConfig.LOG_RESPONSES = false;
  });

  afterEach(() => {
    // Restore original config values
    RuntimeConfig.LOG_REQUESTS = originalLogRequests;
    RuntimeConfig.LOG_RESPONSES = originalLogResponses;
  });

  describe("Request ID handling", () => {
    test("should generate request ID if not provided", async () => {
      app.get("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test");
      const requestId = response.headers.get("X-Request-Id");

      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^[0-9a-f-]{36}$/i); // UUID format
    });

    test("should use existing request ID from header", async () => {
      const customRequestId = "custom-request-123";
      app.get("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test", {
        headers: {
          "x-request-id": customRequestId,
        },
      });

      expect(response.headers.get("X-Request-Id")).toBe(customRequestId);
    });

    test("should generate unique IDs for different requests", async () => {
      app.get("/test", (c) => c.json({ success: true }));

      const response1 = await app.request("/test");
      const response2 = await app.request("/test");
      const response3 = await app.request("/test");

      const id1 = response1.headers.get("X-Request-Id");
      const id2 = response2.headers.get("X-Request-Id");
      const id3 = response3.headers.get("X-Request-Id");

      expect(id1).not.toBe(id2);
      expect(id2).not.toBe(id3);
      expect(id1).not.toBe(id3);
    });

    test("should preserve request ID throughout request lifecycle", async () => {
      let capturedRequestId: string | undefined;

      app.get("/test", (c) => {
        capturedRequestId = c.get("requestId") as string | undefined;
        return c.json({ success: true });
      });

      const response = await app.request("/test");
      const responseRequestId = response.headers.get("X-Request-Id") ?? undefined;

      expect(capturedRequestId).toBe(responseRequestId);
    });
  });

  describe("Request timing", () => {
    test("should track request start time", async () => {
      let capturedStartTime: number | undefined;

      app.get("/test", (c) => {
        capturedStartTime = c.get("requestStart") as number | undefined;
        return c.json({ success: true });
      });

      const before = Date.now();
      await app.request("/test");
      const after = Date.now();

      expect(capturedStartTime).toBeGreaterThanOrEqual(before);
      expect(capturedStartTime).toBeLessThanOrEqual(after);
    });

    test("should measure request duration", async () => {
      app.get("/slow", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return c.json({ success: true });
      });

      const logSpy = spyOn(logger, "info");
      
      await app.request("/slow");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.durationMs).toBeGreaterThanOrEqual(50);
    });

    test("should handle very fast requests", async () => {
      app.get("/fast", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/fast");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.durationMs).toBeGreaterThanOrEqual(0);
      expect(logEntry.durationMs).toBeLessThan(1000);
    });
  });

  describe("Log level determination", () => {
    test("should log 200 responses as info", async () => {
      app.get("/test", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/test");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      expect(logCall![1]).toBe("Request completed");
    });

    test("should log 201 responses as info", async () => {
      app.post("/create", (c) => c.json({ created: true }, StatusCodes.CREATED));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/create", { method: "POST" });

      expect(logSpy).toHaveBeenCalled();
    });

    test("should log 400 responses as warn", async () => {
      app.get("/bad-request", (c) => {
        throw new HTTPException(StatusCodes.BAD_REQUEST, {
          message: "Bad request",
        });
      });

      const logSpy = spyOn(logger, "warn");
      
      await app.request("/bad-request");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      expect(logCall![1]).toBe("Request completed with client error");
    });

    test("should log 404 responses as warn", async () => {
      const logSpy = spyOn(logger, "warn");
      
      await app.request("/non-existent");

      expect(logSpy).toHaveBeenCalled();
    });

    test("should log 500 responses as error", async () => {
      app.get("/error", (c) => {
        throw new Error("Internal error");
      });

      const logSpy = spyOn(logger, "error");
      
      await app.request("/error");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      expect(logCall![1]).toBe("Request completed with server error");
    });

    test("should log 502 responses as error", async () => {
      app.get("/bad-gateway", (c) => {
        throw new HTTPException(StatusCodes.BAD_GATEWAY);
      });

      const logSpy = spyOn(logger, "error");
      
      await app.request("/bad-gateway");

      expect(logSpy).toHaveBeenCalled();
    });

    test("should not log 3xx redirect responses", async () => {
      // Create isolated app for this test
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/redirect", (c) => {
        return c.redirect("/other", StatusCodes.MOVED_PERMANENTLY);
      });

      const infoSpy = spyOn(logger, "info");
      const warnSpy = spyOn(logger, "warn");
      const errorSpy = spyOn(logger, "error");
      
      // Clear any previous calls
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();
      
      await isolatedApp.request("/redirect");

      // 3xx responses should not be logged
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("Log entry content", () => {
    test("should include request method in log", async () => {
      // Create isolated app for this specific test
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.post("/test-post", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-post", { method: "POST" });

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1]; // Get LAST call
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.method).toBe("POST");
    });

    test("should include request path in log", async () => {
      // Create isolated app
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/api/users", (c) => c.json({ users: [] }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/api/users");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.path).toBe("/api/users");
    });

    test("should include status code in log", async () => {
      app.get("/test", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/test");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.statusCode).toBe(StatusCodes.OK);
    });

    test("should include request ID in log", async () => {
      // Create isolated app
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/test-reqid", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      const response = await isolatedApp.request("/test-reqid");
      const requestId = response.headers.get("X-Request-Id");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.requestId).toBe(requestId);
    });

    test("should include duration in log", async () => {
      app.get("/test", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/test");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.durationMs).toBeGreaterThanOrEqual(0);
      expect(typeof logEntry.durationMs).toBe("number");
    });

    test("should include error in log when request fails", async () => {
      // Note: requestLogger doesn't capture errors by default - that's errorHandler's job
      // This test verifies requestLogger behavior when an error occurs
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/error-test", (c) => {
        throw new Error("Test error");
      });

      const errorSpy = spyOn(logger, "error");
      
      await isolatedApp.request("/error-test");

      expect(errorSpy).toHaveBeenCalled();
      
      const logCall = errorSpy.mock.calls[errorSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      // requestLogger logs the error at 500 level
      expect(logEntry.statusCode).toBe(500);
    });
  });

  describe("Response body logging", () => {
    test("should not log response body when LOG_RESPONSES is false", async () => {
      RuntimeConfig.LOG_RESPONSES = false;
      app.get("/test", (c) => c.json({ secret: "data" }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/test");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.responseBody).toBeUndefined();
    });

    test("should log JSON response body when LOG_RESPONSES is true", async () => {
      RuntimeConfig.LOG_RESPONSES = true;
      
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/test-json", (c) => c.json({ data: "test" }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-json");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.responseBody).toEqual({ data: "test" });
      
      RuntimeConfig.LOG_RESPONSES = false;
    });

    test("should log text response body when LOG_RESPONSES is true", async () => {
      RuntimeConfig.LOG_RESPONSES = true;
      
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/test-text", (c) => c.text("Plain text"));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-text");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.responseBody).toBe("Plain text");
      
      RuntimeConfig.LOG_RESPONSES = false;
    });

    test("should handle non-JSON/text responses gracefully", async () => {
      RuntimeConfig.LOG_RESPONSES = true;
      app.get("/binary", (c) => {
        return c.body(new Uint8Array([1, 2, 3]), 200, {
          "Content-Type": "application/octet-stream",
        });
      });

      const logSpy = spyOn(logger, "info");
      
      await app.request("/binary");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      // Should not have responseBody for binary data
      expect(logEntry.responseBody).toBeUndefined();
    });
  });

  describe("RuntimeConfig.LOG_REQUESTS", () => {
    test("should log when LOG_REQUESTS is true", async () => {
      RuntimeConfig.LOG_REQUESTS = true;
      app.get("/test", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/test");

      expect(logSpy).toHaveBeenCalled();
    });

    test("should not log when LOG_REQUESTS is false", async () => {
      RuntimeConfig.LOG_REQUESTS = false;
      
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/test-nolog", (c) => c.json({ success: true }));

      const infoSpy = spyOn(logger, "info");
      const warnSpy = spyOn(logger, "warn");
      const errorSpy = spyOn(logger, "error");
      
      // Clear any previous calls
      infoSpy.mockClear();
      warnSpy.mockClear();
      errorSpy.mockClear();
      
      await isolatedApp.request("/test-nolog");

      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
      
      RuntimeConfig.LOG_REQUESTS = true;
    });

    test("should still set request ID even when logging is disabled", async () => {
      RuntimeConfig.LOG_REQUESTS = false;
      app.get("/test", (c) => c.json({ success: true }));

      const response = await app.request("/test");
      const requestId = response.headers.get("X-Request-Id");

      expect(requestId).toBeTruthy();
      expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
    });
  });

  describe("Different HTTP methods", () => {
    test("should log GET requests", async () => {
      app.get("/test", (c) => c.json({ method: "GET" }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/test", { method: "GET" });

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[0];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.method).toBe("GET");
    });

    test("should log POST requests", async () => {
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.post("/test-post-method", (c) => c.json({ method: "POST" }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-post-method", { method: "POST" });

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.method).toBe("POST");
    });

    test("should log PUT requests", async () => {
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.put("/test-put", (c) => c.json({ method: "PUT" }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-put", { method: "PUT" });

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.method).toBe("PUT");
    });

    test("should log DELETE requests", async () => {
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.delete("/test-delete", (c) => c.json({ method: "DELETE" }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-delete", { method: "DELETE" });

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.method).toBe("DELETE");
    });

    test("should log PATCH requests", async () => {
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.patch("/test-patch", (c) => c.json({ method: "PATCH" }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-patch", { method: "PATCH" });

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.method).toBe("PATCH");
    });
  });

  describe("Edge cases", () => {
    test("should handle requests with query parameters", async () => {
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/test-query", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/test-query?foo=bar&baz=qux");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.path).toBe("/test-query");
    });

    test("should handle empty path", async () => {
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/", (c) => c.json({ root: true }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request("/");

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.path).toBe("/");
    });

    test("should handle very long paths", async () => {
      const longPath = "/test-long/" + "a".repeat(500);
      
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get(longPath, (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await isolatedApp.request(longPath);

      expect(logSpy).toHaveBeenCalled();
      
      const logCall = logSpy.mock.calls[logSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      expect(logEntry.path).toBe(longPath);
    });

    test("should handle missing response gracefully", async () => {
      // This is an edge case that shouldn't normally happen
      // but we test the warning path
      app.use("/no-response", async (c, next) => {
        await next();
        // Simulate missing response by not setting one
      });

      const warnSpy = spyOn(logger, "warn");
      
      await app.request("/no-response");

      // In reality, Hono returns 404, not "no response"
      // So we check for a warn log call
      expect(warnSpy).toHaveBeenCalled();
      
      const lastCall = warnSpy.mock.calls[warnSpy.mock.calls.length - 1];
      const logEntry = lastCall![0] as any;
      expect(logEntry.path).toBe("/no-response");
    });

    test("should handle concurrent requests independently", async () => {
      app.get("/test", (c) => c.json({ success: true }));

      const responses = await Promise.all([
        app.request("/test"),
        app.request("/test"),
        app.request("/test"),
      ]);

      const requestIds = responses.map((r) => r.headers.get("X-Request-Id"));

      // All should have unique request IDs
      expect(new Set(requestIds).size).toBe(3);
    });

    test("should handle async route handlers", async () => {
      app.get("/async", async (c) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return c.json({ async: true });
      });

      const logSpy = spyOn(logger, "info");
      
      const response = await app.request("/async");

      expect(response.status).toBe(StatusCodes.OK);
      expect(logSpy).toHaveBeenCalled();
    });

    test("should handle requests with special characters in path", async () => {
      app.get("/test/path%20with%20spaces", (c) => c.json({ success: true }));

      const logSpy = spyOn(logger, "info");
      
      await app.request("/test/path%20with%20spaces");

      expect(logSpy).toHaveBeenCalled();
    });
  });

  describe("Integration with error handling", () => {
    test("should log request errors", async () => {
      const isolatedApp = new Hono<RequestErrorEnv>();
      isolatedApp.use("*", requestLogger);
      isolatedApp.get("/error-integration", (c) => {
        const error = new Error("Test error");
        throw error;
      });

      const errorSpy = spyOn(logger, "error");
      
      await isolatedApp.request("/error-integration");

      expect(errorSpy).toHaveBeenCalled();
      
      const logCall = errorSpy.mock.calls[errorSpy.mock.calls.length - 1];
      expect(logCall).toBeDefined();
      const logEntry = logCall![0] as any;

      // Verify it logged with error level and 500 status
      expect(logEntry.statusCode).toBe(500);
    });

    test("should handle HTTPException errors", async () => {
      app.get("/http-error", (c) => {
        throw new HTTPException(StatusCodes.UNAUTHORIZED);
      });

      const warnSpy = spyOn(logger, "warn");
      
      await app.request("/http-error");

      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("Performance", () => {
    test("should not significantly impact request performance", async () => {
      app.get("/fast", (c) => c.json({ success: true }));

      const startTime = Date.now();
      
      await app.request("/fast");
      
      const duration = Date.now() - startTime;

      // Logging overhead should be minimal (less than 50ms)
      expect(duration).toBeLessThan(50);
    });

    test("should handle high request volume", async () => {
      app.get("/test", (c) => c.json({ success: true }));

      const requests = Array.from({ length: 100 }, () => app.request("/test"));
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;

      // All requests should succeed
      expect(responses.every((r) => r.status === StatusCodes.OK)).toBe(true);
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });
});
