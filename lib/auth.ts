// lib/auth.ts
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import prisma from "./prisma";

// Railway/프로덕션 환경 변수 검증
if (process.env.NODE_ENV === "production" && !process.env.NEXTAUTH_SECRET) {
  throw new Error(
    "NEXTAUTH_SECRET is required in production. Please set it in Railway environment variables."
  );
}

export const authOptions: NextAuthOptions = {
  // NextAuth secret (필수, Railway 환경 변수에서 설정)
  secret: process.env.NEXTAUTH_SECRET,

  // NextAuth v4는 NEXTAUTH_URL 환경 변수를 자동으로 사용하여 호스트 신뢰
  // Railway에서 NEXTAUTH_URL을 설정하면 자동으로 프록시 환경 처리됨

  // JWT 전략: 낮은 트래픽 개인 앱에 최적화
  // - DB 쿼리 없이 빠른 인증
  // - Railway 서버리스 환경에 적합
  // - PrismaAdapter 불필요 (JWT는 DB 세션 테이블 미사용)
  session: {
    strategy: "jwt",
    // JWT 토큰 만료 시간: 30일 (개인 앱에 적합)
    maxAge: 30 * 24 * 60 * 60, // 30 days in seconds
  },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "아이디", type: "text" },
        password: { label: "비밀번호", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // username 또는 email로 로그인 가능하도록 수정 (기존 사용자 호환성)
          let user = null;
          
          // 먼저 username으로 시도
          try {
            user = await prisma.user.findUnique({
              where: { username: credentials.username },
            });
          } catch (err: any) {
            // username 필드가 없거나 unique 제약이 없는 경우
            if (err.code === "P2001" || err.message?.includes("Unknown arg `username`")) {
              console.error("[Auth] Username field not found, trying email...");
            } else {
              throw err;
            }
          }

          // username으로 찾지 못하면 email로 시도 (기존 사용자용)
          if (!user) {
            try {
              user = await prisma.user.findUnique({
                where: { email: credentials.username },
              });
            } catch (err: any) {
              console.error("[Auth] Error finding user by email:", err);
              return null;
            }
          }

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
            name: user.nickname ?? user.name ?? null,
            email: user.email ?? null,
            nickname: user.nickname ?? null,
            username: user.username ?? null,
            role: user.role ?? "user",
            isDisabled: user.isDisabled ?? false,
          } as any;
        } catch (err: any) {
          console.error("[Auth] Authorize error:", err);
          // AccountDisabled는 그대로 throw
          if (err.message === "AccountDisabled") {
            throw err;
          }
          return null;
        }
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
        token.nickname = (user as any).nickname ?? null;
        token.username = (user as any).username ?? null;
        (token as any).isDisabled = (user as any).isDisabled ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = (token as any).role ?? "user";
        (session.user as any).nickname = (token as any).nickname ?? null;
        (session.user as any).username = (token as any).username ?? null;
        (session.user as any).isDisabled =
          (token as any).isDisabled ?? false;
      }
      return session;
    },
    // Railway/프로덕션 환경에서 redirect URL 안전성 보장
    async redirect({ url, baseUrl }) {
      // 상대 경로는 baseUrl과 결합
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // 같은 origin이면 허용
      if (new URL(url).origin === baseUrl) return url;
      // 그 외는 baseUrl로 리다이렉트 (보안)
      return baseUrl;
    },
  },
};
