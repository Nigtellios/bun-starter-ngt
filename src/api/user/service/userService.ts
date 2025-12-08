import type { User } from "@api/user/model/userModel.ts";
import { UserRepository } from "@api/user/repository/userRepository.ts";
import { ServiceResponse } from "@common/models/serviceResponse.ts";
import { StatusCodes } from "http-status-codes";

export class UserService {
  private userRepository: UserRepository;

  constructor(repository: UserRepository = new UserRepository()) {
    this.userRepository = repository;
  }

  async findAll(): Promise<ServiceResponse<User[]>> {
    const users = await this.userRepository.findAllAsync();
    return ServiceResponse.success<User[]>("Users found", users, StatusCodes.OK);
  }

  async findById(id: number): Promise<ServiceResponse<User | null>> {
    const user = await this.userRepository.findByIdAsync(id);
    if (!user) {
      return ServiceResponse.failure("User not found", null, StatusCodes.NOT_FOUND);
    }
    return ServiceResponse.success<User>("User found", user, StatusCodes.OK);
  }
}

export const userService = new UserService();
