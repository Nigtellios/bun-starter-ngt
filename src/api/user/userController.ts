import type { Context } from "hono";
import { handleServiceResponse } from "@common/handlers/httpHandlers.ts";
import { userService } from "@api/user/service/userService.ts";

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
