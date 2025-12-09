// C:\ticketcall\middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      // 토큰 없으면 접근 불가
      if (!token) return false;
      // admin 계정만 /admin 이하 접근 허용
      return token.role === "admin";
    },
  },
});

export const config = {
  matcher: ["/admin/:path*"],
};
