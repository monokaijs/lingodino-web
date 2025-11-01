import {decode, JWT} from "next-auth/jwt";
import {cookies} from "next/headers";

export async function authDecode(token?: string): Promise<JWT | undefined> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('next-auth.session-token')?.value;
    const decoded = await decode({
      token: token || sessionToken,
      secret: process.env.NEXTAUTH_SECRET || "the-most-secure-secret-in-the-world",
    });
    return decoded || undefined;
  } catch (error) {
    return undefined;
  }
}
