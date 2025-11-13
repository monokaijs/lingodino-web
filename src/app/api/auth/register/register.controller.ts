import {ApiRoutes} from "@/lib/types/routes";
import {dbService} from "@/lib/services/db";
import {ApiError} from "next/dist/server/api-utils";
import bcrypt from "bcryptjs";
import {User, UserRole} from "@/lib/types/models/user";
import {createTypedApi} from "@/lib/utils/createApi";
import {registerSchema} from "@/lib/validations/register";

export const registerApi = createTypedApi<User>()(ApiRoutes.register, async (req, ctx, decoded) => {
  const existingUser = await dbService.user.findOne({username: ctx.data.username});
  if (existingUser) throw new ApiError(400, "Username already exists");
  const hashedPassword = await bcrypt.hash(ctx.data.password, 10);
  const user = await dbService.user.create({
    username: ctx.data.username,
    password: hashedPassword,
    fullName: ctx.data.fullName,
    role: UserRole.User,
  });
  return {
    data: user,
    message: "Registration successful",
    code: 201
  };
}, {
  schemas: {
    body: registerSchema
  },
});