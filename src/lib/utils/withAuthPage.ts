import {redirect} from 'next/navigation';
import {UserRole} from "@/lib/types/models/user";
import {authDecode} from "@/lib/utils/authDecode";

interface WithAuthOptions {
  roles?: UserRole[];
  redirectTo?: string;
  forbiddenPath?: string;
}

export async function withAuthPage(options: WithAuthOptions = {}) {
  const {roles = [], redirectTo = '/auth/login', forbiddenPath = '/'} = options;
  const decoded = await authDecode();
  if (!decoded || !decoded.role) {
    return redirect(redirectTo);
  } else {
    if (roles.length > 0 && !roles.includes(decoded.role as UserRole)) return redirect(forbiddenPath);
  }
  return !!decoded.role;
}
