import { test, expect } from "bun:test";
import { StatusCodes } from "http-status-codes";
import type { ServiceResponse } from "@common/models/serviceResponse.ts";
import app from "@init/app.ts";

test(
    "Health Check API endpoints",
    async () => {
        const response = await app.request("/health-check");
        const result = (await response.json()) as ServiceResponse<null>;
        
        expect(response.status).toEqual(StatusCodes.OK);
        expect(result.success).toBeTruthy();
        expect(result.responseObject).toBeNull();
        expect(result.message).toEqual("Service is healthy");
    }
);