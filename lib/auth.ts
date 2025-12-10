// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,

  session: {
    strategy: "jwt",
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "이메일", type: "email" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        // 🔥 정지된 계정이면 로그인 거부
        if (user.isDisabled) {
          throw new Error("AccountDisabled");
        }

        const ok = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!ok) return null;

        return {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
          role: user.role ?? "user",
          isDisabled: user.isDisabled ?? false,
        } as any;
      },
    }),
  ],

  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "user";
        (token as any).isDisabled = (user as any).isDisabled ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = (token as any).role ?? "user";
        (session.user as any).isDisabled =
          (token as any).isDisabled ?? false;
      }
      return session;
    },
  },
};
