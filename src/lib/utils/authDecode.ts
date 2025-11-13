import {decode, JWT} from "next-auth/jwt";
import {cookies} from "next/headers";

export async function authDecode(token?: string): Promise<JWT | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('next-auth.session-token')?.value;
    if (!process.env.NEXTAUTH_SECRET) return null;
    const decoded = await decode({
      token: token || sessionToken,
      secret: process.env.NEXTAUTH_SECRET,
    });
    return decoded || null;
  } catch (error) {
    return null;
  }
}
