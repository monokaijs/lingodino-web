import {NextRequest} from "next/server";
import {dbService} from "@/lib/services/db";
import {UserRole} from "@/lib/types/models/user";
import bcrypt from "bcryptjs";
import {withApi} from "@/lib/utils/withApi";

async function handler(request: NextRequest) {
  const systemPreference = await dbService.systemPreference.findOne({});

  if (!systemPreference) {
    throw {code: 400, message: "System is not set up yet"};
  }

  if (!systemPreference.allowRegistration) {
    throw {code: 403, message: "Registration is not allowed"};
  }

  const body = await request.json();
  const {username, password, fullName} = body;

  if (!username || typeof username !== 'string') {
    throw {code: 400, message: "Username is required"};
  }

  if (!password || typeof password !== 'string') {
    throw {code: 400, message: "Password is required"};
  }

  if (!fullName || typeof fullName !== 'string') {
    throw {code: 400, message: "Full name is required"};
  }

  const existingUser = await dbService.user.findOne({username});
  if (existingUser) {
    throw {code: 400, message: "Username already exists"};
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await dbService.user.create({
    username,
    password: hashedPassword,
    fullName,
    role: UserRole.Reader,
  });

  return {
    message: "Registration successful",
    user: {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
    },
  };
}

export const POST = withApi(handler);

