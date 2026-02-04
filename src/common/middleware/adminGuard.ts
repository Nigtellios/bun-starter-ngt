import { timingSafeEqual } from "node:crypto";
import { handleServiceResponse } from "@common/handlers/httpHandlers.ts";
import { ServiceResponse } from "@common/models/serviceResponse.ts";
import { isIpAllowlisted } from "@common/utils/ip.ts";
import RuntimeConfig from "@config/runtimeConfig.ts";
import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";

const extractClientIp = (headers: Headers): string | null => {
  // With a reverse proxy, `x-forwarded-for` is a comma-separated list; first is the client.
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return null;
};

const safeEqual = (a: string, b: string): boolean => {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
};

/**
 * Admin guard middleware:
 * - Requires ADMIN_API_KEY
 * - Checks Authorization: Bearer <key> OR X-Admin-Api-Key: <key>
 * - Optionally checks client IP against ADMIN_IP_ALLOWLIST (when configured)
 *
 * IMPORTANT:
 * Client IP extraction relies on reverse-proxy headers (X-Forwarded-For / X-Real-Ip).
 * For a secure setup, bind the app to localhost and only expose it via a trusted proxy.
 */
const adminGuard = createMiddleware(async (context, next) => {
  const configuredKey = RuntimeConfig.ADMIN_API_KEY;

  if (!configuredKey || configuredKey.trim().length === 0) {
    const response = ServiceResponse.failure("Admin API not configured", null, StatusCodes.SERVICE_UNAVAILABLE);
    return handleServiceResponse(response, context);
  }

  const authHeader = context.req.header("authorization") ?? "";
  const bearerPrefix = "bearer ";
  const bearerToken = authHeader.toLowerCase().startsWith(bearerPrefix)
    ? authHeader.slice(bearerPrefix.length).trim()
    : null;

  const headerToken = context.req.header("x-admin-api-key")?.trim() ?? null;
  const token = bearerToken || headerToken;

  if (!token || !safeEqual(token, configuredKey)) {
    const response = ServiceResponse.failure("Unauthorized", null, StatusCodes.UNAUTHORIZED);
    context.header("WWW-Authenticate", 'Bearer realm="admin"');
    return handleServiceResponse(response, context);
  }

  const allowlist = RuntimeConfig.ADMIN_IP_ALLOWLIST;
  if (allowlist.length > 0) {
    if (!RuntimeConfig.TRUST_PROXY) {
      const response = ServiceResponse.failure("IP allowlist requires TRUST_PROXY=true", null, StatusCodes.FORBIDDEN);
      return handleServiceResponse(response, context);
    }

    const clientIp = extractClientIp(context.req.raw.headers);
    if (!clientIp || !isIpAllowlisted(clientIp, allowlist)) {
      const response = ServiceResponse.failure("Forbidden", null, StatusCodes.FORBIDDEN);
      return handleServiceResponse(response, context);
    }
  }

  await next();
});

export default adminGuard;
