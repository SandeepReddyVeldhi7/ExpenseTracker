import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

import bcrypt from "bcryptjs";
import DashboardUsers from "@/models/dashboardUsers";

async function findUser(credentials) {
  await connectDB();

  // Try finding an owner first (by email only)
  let user = await User.findOne({ email: credentials.email });
  let role = "owner";

  // If not found, try finding staff by email OR username
  if (!user) {
    user = await DashboardUsers.findOne({
      $or: [{ email: credentials.email }, { username: credentials.email }],
    });
    role = "staff123";
  }

  if (!user) {
    throw new Error("User not found");
  }

  const isCorrect = await bcrypt.compare(credentials.password, user.password);
  if (!isCorrect) {
    throw new Error("Invalid credentials");
  }

  return { ...user.toObject(), role };
}

export const authOptions = {
  pages: {
      secret: process.env.NEXTAUTH_SECRET,
    signIn: "/sign-in",
    
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {},
      async authorize(credentials) {
        try {
          const user = await findUser(credentials);
          return user;
        } catch (error) {
          throw new Error(error.message || "Sign-in failed");
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
        token.email = user.email;
        token.id = user._id;
        token.role = user.role; // save role here!
      }
        console.log("🟢 [JWT CALLBACK] Token being returned:", token);
      return token;
    },
    async session({ session, token }) {
      session.user = {
        username: token.username,
        email: token.email,
        id: token.id,
        role: token.role, // include role in session too
      };
      return session;
    },
  },
};

export default NextAuth(authOptions);
