// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  // Prisma + NextAuth 연동
  adapter: PrismaAdapter(prisma) as any,

  // 세션은 JWT 방식 사용
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
        // 입력 값 체크
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // 이메일로 유저 조회
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        // 유저가 없거나, passwordHash가 없으면 로그인 실패
        if (!user || !user.passwordHash) {
          return null;
        }

        // 비밀번호 검증 (입력한 비번 vs DB의 passwordHash)
        const ok = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!ok) return null;

        // 여기서 return 되는 값이 JWT / session.user에 들어감
        return {
          id: user.id,
          name: user.name ?? null,
          email: user.email ?? null,
        };
      },
    }),
  ],

  // 커스텀 로그인 페이지 경로 (나중에 /app/auth/login/page.tsx 만들 거임)
  pages: {
    signIn: "/auth/login",
  },

  callbacks: {
    // JWT 안에 user.id 넣기
    async jwt({ token, user }) {
      if (user) {
        (token as any).id = (user as any).id;
      }
      return token;
    },

    // session.user 안에 id 넣기
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = (token as any).id;
      }
      return session;
    },
  },
};
