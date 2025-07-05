import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import DashboardUsers from "@/models/dashboardUsers";

/**
 * Utility to find user by email or username in your DB
 */
async function findUserByEmailOrUsername(emailOrUsername) {
  await connectDB();

  // Check owner collection
  let user = await User.findOne({ email: emailOrUsername });
  if (user) return { ...user.toObject(), role: "owner" };

  // Check staff collection
  user = await DashboardUsers.findOne({
    $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });
  if (user) return { ...user.toObject(), role: "staff123" };

  return null;
}

export default NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    /**
     * Email & Password login
     */
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing email or password");
        }

        const user = await findUserByEmailOrUsername(credentials.email);
        if (!user) throw new Error("User not found");

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) throw new Error("Invalid credentials");

        return {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          role: user.role,
        };
      },
    }),

    /**
     * Google login
     */
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    /**
     * Runs on login - both credentials & google
     */
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        console.log("Google Sign-In attempt for:", user.email);

        // Enforce DB check
        const dbUser = await findUserByEmailOrUsername(user.email);
        if (!dbUser) {
          console.log(`❌ Google SignIn blocked. Email not found in DB: ${user.email}`);
          return false;
        }

        // Attach role to user object
        user.id = dbUser._id.toString();
        user.username = dbUser.username || dbUser.email.split("@")[0];
        user.role = dbUser.role;
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.username = user.username;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      session.user = {
        id: token.id,
        email: token.email,
        username: token.username,
        role: token.role,
      };
      return session;
    },
  },
});
