// components/site-header.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function SiteHeader() {
  const { data: session, status } = useSession();

  const isLoggedIn = status === "authenticated";

  return (
    <header className="border-b bg-background">
      <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4">
        {/* 왼쪽: 로고 / 홈 링크 */}
        <Link href="/" className="text-lg font-semibold">
          TicketForum 티켓포럼
        </Link>

        {/* 오른쪽: 로그인 상태에 따라 분기 */}
        <nav className="flex items-center gap-4 text-sm">
          {/* 나중에 자유게시판, 공지사항 등 라우트 생기면 여기 링크 추가하면 됨 */}
          {/* <Link href="/board" className="hover:underline">
            자유게시판
          </Link>
          <Link href="/notice" className="hover:underline">
            공지사항
          </Link> */}

          {!isLoggedIn && (
            <>
              <Link href="/auth/login" className="hover:underline">
                로그인
              </Link>
              <Link href="/auth/register" className="hover:underline">
                회원가입
              </Link>
            </>
          )}

          {isLoggedIn && (
            <>
              <span className="text-muted-foreground">
                {session?.user?.name || session?.user?.email || "회원"}
              </span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded border px-2 py-1 text-xs hover:bg-accent"
              >
                로그아웃
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
