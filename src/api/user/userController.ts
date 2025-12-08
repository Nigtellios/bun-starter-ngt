import { userService } from "@api/user/service/userService.ts";
import { handleServiceResponse } from "@common/handlers/httpHandlers.ts";
import type { Context } from "hono";

class UserController {
  public getUsers = async (context: Context) => {
    const serviceResponse = await userService.findAll();
    return handleServiceResponse(serviceResponse, context);
  };

  public getUser = async (context: Context) => {
    const { id } = context.req.param();
    const serviceResponse = await userService.findById(Number(id));
    return handleServiceResponse(serviceResponse, context);
  };
}

export const userController = new UserController();
