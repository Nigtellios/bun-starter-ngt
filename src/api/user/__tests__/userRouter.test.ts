import { describe, expect, test } from "bun:test";
import type { User } from "@api/user/model/userModel.ts";
import type { ServiceResponse } from "@common/models/serviceResponse.ts";
import app from "@init/app.ts";
import { StatusCodes } from "http-status-codes";

describe("User API endpoints", () => {
  describe("GET /users", () => {
    test("should return list of all users", async () => {
      const response = await app.request("/users");
      const result = (await response.json()) as ServiceResponse<User[]>;

      expect(response.status).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).toEqual("Users found");
      expect(Array.isArray(result.responseObject)).toBe(true);
      expect(result.responseObject?.length).toBeGreaterThan(0);
    });

    test("should return users with correct schema", async () => {
      const response = await app.request("/users");
      const result = (await response.json()) as ServiceResponse<User[]>;

      expect(result.responseObject).toBeTruthy();
      if (result.responseObject && result.responseObject.length > 0) {
        const firstUser = result.responseObject[0];
        if (firstUser) {
          expect(firstUser).toHaveProperty("id");
          expect(firstUser).toHaveProperty("name");
          expect(firstUser).toHaveProperty("email");
          expect(firstUser).toHaveProperty("age");
          expect(firstUser).toHaveProperty("createdAt");
          expect(firstUser).toHaveProperty("updatedAt");

          expect(typeof firstUser.id).toBe("number");
          expect(typeof firstUser.name).toBe("string");
          expect(typeof firstUser.email).toBe("string");
          expect(typeof firstUser.age).toBe("number");
        }
      }
    });
  });

  describe("GET /users/:id", () => {
    test("should return user when valid ID is provided", async () => {
      const response = await app.request("/users/1");
      const result = (await response.json()) as ServiceResponse<User>;

      expect(response.status).toEqual(StatusCodes.OK);
      expect(result.success).toBeTruthy();
      expect(result.message).toEqual("User found");
      expect(result.responseObject).toBeTruthy();
      expect(result.responseObject?.id).toBe(1);
    });

    test("should return 404 when user not found", async () => {
      const response = await app.request("/users/999");
      const result = (await response.json()) as ServiceResponse<null>;

      expect(response.status).toEqual(StatusCodes.NOT_FOUND);
      // The message could be "User not found" from service or "Not Found" from Hono's 404 handler
      expect(result.message).toEqual("Not Found");
    });

    test("should return 400 when invalid ID format is provided", async () => {
      const response = await app.request("/users/invalid");
      const result = (await response.json()) as ServiceResponse<null>;

      expect(response.status).toEqual(StatusCodes.BAD_REQUEST);
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("Invalid input");
    });

    test("should return 400 when negative ID is provided", async () => {
      const response = await app.request("/users/-1");
      const result = (await response.json()) as ServiceResponse<null>;

      expect(response.status).toEqual(StatusCodes.BAD_REQUEST);
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("Invalid input");
    });

    test("should return 400 when ID is zero", async () => {
      const response = await app.request("/users/0");
      const result = (await response.json()) as ServiceResponse<null>;

      expect(response.status).toEqual(StatusCodes.BAD_REQUEST);
      expect(result.success).toBeFalsy();
      expect(result.message).toContain("Invalid input");
    });

    test("should return user with correct schema", async () => {
      const response = await app.request("/users/2");
      const result = (await response.json()) as ServiceResponse<User>;

      expect(result.responseObject).toBeTruthy();
      if (result.responseObject) {
        expect(result.responseObject).toHaveProperty("id");
        expect(result.responseObject).toHaveProperty("name");
        expect(result.responseObject).toHaveProperty("email");
        expect(result.responseObject).toHaveProperty("age");
        expect(result.responseObject).toHaveProperty("createdAt");
        expect(result.responseObject).toHaveProperty("updatedAt");

        expect(result.responseObject.id).toBe(2);
        expect(result.responseObject.name).toBe("Robert");
        expect(result.responseObject.email).toBe("robert@example.com");
      }
    });
  });
});
