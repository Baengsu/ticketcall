// components/site-header.tsx
"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function SiteHeader() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const role = (session?.user as any)?.role ?? "user";
  const isAdmin = role === "admin";

  const handleRebuild = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/rebuild", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setMsg(data.message ?? "리빌드 실패");
      } else {
        setMsg(`리빌드 완료 (${data.generatedAt})`);
      }
    } catch (err) {
      console.error(err);
      setMsg("서버 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex items-center justify-between h-14 px-4">
        {/* 왼쪽: 로고 + 메뉴 */}
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold">
            티켓포럼
          </Link>
          <nav className="flex gap-3 text-sm text-muted-foreground">
            <Link href="/board/notice">공지사항</Link>
            <Link href="/board/free">건의사항</Link>
          </nav>
        </div>

        {/* 오른쪽: 관리자 버튼 + 로그인/로그아웃 */}
        <div className="flex items-center gap-3 text-xs">
          {/* 관리자 전용 리빌드 버튼 */}
          {isAdmin && (
            <button
              onClick={handleRebuild}
              disabled={loading}
              className="px-3 py-1 rounded-md border text-xs"
            >
              {loading ? "리빌드 중..." : "크롤링 리빌드"}
            </button>
          )}

          {/* 리빌드 결과 메시지 */}
          {msg && (
            <span className="text-[10px] text-muted-foreground max-w-[200px] truncate">
              {msg}
            </span>
          )}

          {session ? (
            <>
              {/* 로그인 중일 때: 이메일 + role 표시 */}
              <span className="text-muted-foreground">
                {(session.user as any).email} ({role})
              </span>
              {/* 로그아웃 버튼 */}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3 py-1 rounded-md border text-xs"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              {/* 비로그인 상태일 때: 로그인 / 회원가입 */}
              <Link
                href="/auth/login"
                className="text-muted-foreground hover:underline"
              >
                로그인
              </Link>
              <Link
                href="/auth/register"
                className="text-muted-foreground hover:underline"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
