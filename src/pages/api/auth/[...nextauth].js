import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import DashboardUsers from "@/models/dashboardUsers";
import bcrypt from "bcryptjs";

/** Utility: find user for credentials or Google **/
async function findUserByEmail(email) {
  await connectDB();

  let user = await User.findOne({ email });
  if (user) return { ...user.toObject(), role: "owner" };

  user = await DashboardUsers.findOne({
    $or: [{ email }, { username: email }],
  });
  if (user) return { ...user.toObject(), role: "staff123" };

  return null;
}

/** Utility: validate credentials **/
async function validateCredentials(credentials) {
  const user = await findUserByEmail(credentials.email);
  if (!user) throw new Error("User not found");

  const isCorrect = await bcrypt.compare(credentials.password, user.password);
  if (!isCorrect) throw new Error("Invalid credentials");

  return user;
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {},
      async authorize(credentials) {
        return await validateCredentials(credentials);
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      async profile(profile) {
        // This is the user data returned by Google
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === "google") {
        // Only allow Google sign-in if email exists in DB
        const dbUser = await findUserByEmail(user.email);
        if (!dbUser) {
          console.log(`❌ Google SignIn blocked. Email not found: ${user.email}`);
          return false;
        }
        // Attach our role to user object
        user.role = dbUser.role;
        user.username = dbUser.username || dbUser.name || dbUser.email.split("@")[0];
        user.id = dbUser._id.toString();
      }
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // User logged in
      if (user) {
        token.username = user.username;
        token.email = user.email;
        token.id = user.id || user._id;
        token.role = user.role || "staff123";
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        username: token.username,
        email: token.email,
        id: token.id,
        role: token.role,
      };
      return session;
    },
  },
};

export default NextAuth(authOptions);
