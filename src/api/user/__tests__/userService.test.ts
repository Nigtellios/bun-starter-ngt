import { beforeEach, describe, expect, test } from "bun:test";
import { UserRepository } from "@api/user/repository/userRepository.ts";
import { UserService } from "@api/user/service/userService.ts";
import { StatusCodes } from "http-status-codes";

describe("UserService", () => {
  let userService: UserService;
  let userRepository: UserRepository;

  beforeEach(() => {
    userRepository = new UserRepository();
    userService = new UserService(userRepository);
  });

  describe("findAll", () => {
    test("should return all users with success response", async () => {
      const serviceResponse = await userService.findAll();

      expect(serviceResponse.success).toBe(true);
      expect(serviceResponse.statusCode).toBe(StatusCodes.OK);
      expect(serviceResponse.message).toBe("Users found");
      expect(Array.isArray(serviceResponse.responseObject)).toBe(true);
      expect(serviceResponse.responseObject?.length).toBeGreaterThan(0);
    });

    test("should return users with correct properties", async () => {
      const serviceResponse = await userService.findAll();
      const users = serviceResponse.responseObject;

      expect(users).toBeTruthy();
      if (users && users.length > 0) {
        const firstUser = users[0];
        expect(firstUser).toHaveProperty("id");
        expect(firstUser).toHaveProperty("name");
        expect(firstUser).toHaveProperty("email");
        expect(firstUser).toHaveProperty("age");
        expect(firstUser).toHaveProperty("createdAt");
        expect(firstUser).toHaveProperty("updatedAt");
      }
    });
  });

  describe("findById", () => {
    test("should return user when found", async () => {
      const serviceResponse = await userService.findById(1);

      expect(serviceResponse.success).toBe(true);
      expect(serviceResponse.statusCode).toBe(StatusCodes.OK);
      expect(serviceResponse.message).toBe("User found");
      expect(serviceResponse.responseObject).toBeTruthy();
      expect(serviceResponse.responseObject?.id).toBe(1);
    });

    test("should return 404 when user not found", async () => {
      const serviceResponse = await userService.findById(999);

      expect(serviceResponse.success).toBe(false);
      expect(serviceResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
      expect(serviceResponse.message).toBe("User not found");
      expect(serviceResponse.responseObject).toBeNull();
    });

    test("should return user with correct properties", async () => {
      const serviceResponse = await userService.findById(2);

      expect(serviceResponse.responseObject).toBeTruthy();
      if (serviceResponse.responseObject) {
        expect(serviceResponse.responseObject.id).toBe(2);
        expect(serviceResponse.responseObject.name).toBe("Robert");
        expect(serviceResponse.responseObject.email).toBe("robert@example.com");
        expect(serviceResponse.responseObject.age).toBe(21);
      }
    });

    test("should handle zero ID correctly", async () => {
      const serviceResponse = await userService.findById(0);

      expect(serviceResponse.success).toBe(false);
      expect(serviceResponse.statusCode).toBe(StatusCodes.NOT_FOUND);
    });
  });
});
