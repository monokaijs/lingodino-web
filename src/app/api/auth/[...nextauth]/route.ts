import NextAuth, {NextAuthOptions} from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import {dbService} from "@/lib/services/db";
import {UserRole} from "@/lib/types/models/user";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_OAUTH_CLIENT_ID || "",
      clientSecret: process.env.APPLE_OAUTH_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    async signIn({user, account, profile}) {
      if (!account) return false;

      await dbService.connect();

      if (account.provider === "google") {
        let dbUser = await dbService.user.findOne({googleId: account.providerAccountId});
        if (!dbUser) {
          dbUser = await dbService.user.create({
            googleId: account.providerAccountId,
            email: user.email || "",
            fullName: user.name || "",
            photo: user.image || "",
            role: UserRole.User,
          });
        }
        (user as any).dbId = dbUser._id.toString();
        (user as any).role = dbUser.role;
      } else if (account.provider === "apple") {
        let dbUser = await dbService.user.findOne({appleId: account.providerAccountId});
        if (!dbUser) {
          dbUser = await dbService.user.create({
            appleId: account.providerAccountId,
            email: user.email || "",
            fullName: user.name || "",
            role: UserRole.User,
          });
        }
        (user as any).dbId = dbUser._id.toString();
        (user as any).role = dbUser.role;
      }

      return true;
    },
    async jwt({token, user, account}) {
      if (user) {
        token.id = (user as any).dbId || user.id;
        token.role = (user as any).role || UserRole.User;
        token.fullName = user.name || "";
        token.photo = user.image || "";
      }
      return token;
    },
    async session({session, token}) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.fullName = token.fullName;
        session.user.email = token.email || "";
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export {handler as GET, handler as POST};

