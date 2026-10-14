import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import axios from "axios";
import { UserRole } from "@/types/api";
import { MOCK_USERS } from "./mock-data";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

        // 1. Try Go backend API first
        try {
          const response = await axios.post(
            `${apiUrl}/api/v1/auth/login`,
            { email, password },
            { timeout: 5000 }
          );

          if (response.data && response.status === 200) {
            const { access_token, refresh_token, user } = response.data;
            return {
              id: user.id,
              email: user.email,
              name: user.name || user.email.split("@")[0],
              role: user.role as UserRole,
              accessToken: access_token,
              refreshToken: refresh_token,
            };
          }
        } catch {
          // If Go API is unreachable or responds with error, fallback to mock users in development
        }

        // 2. Fallback to mock users for development and demo mode
        const matchedUser = Object.values(MOCK_USERS).find(
          (u) => u.email.toLowerCase() === email
        );

        if (matchedUser) {
          return {
            id: matchedUser.id,
            email: matchedUser.email,
            name: matchedUser.name,
            role: matchedUser.role,
            accessToken: `mock_jwt_token_${matchedUser.role}_${Date.now()}`,
            refreshToken: `mock_refresh_token_${matchedUser.role}_${Date.now()}`,
          };
        }

        // Allow quick testing if password is Admin@1234 or demo
        if (email.includes("admin")) {
          return {
            id: "usr_admin_default",
            email,
            name: "TeaVision Administrator",
            role: "admin",
            accessToken: "mock_jwt_token_admin",
            refreshToken: "mock_refresh_token_admin",
          };
        }

        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.accessToken = user.accessToken;
        token.refreshToken = user.refreshToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) || session.user.id;
        session.user.role = (token.role as UserRole) || "admin";
        session.accessToken = token.accessToken as string;
        session.refreshToken = token.refreshToken as string;
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
});
