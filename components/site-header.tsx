// C:\ticketcall\components\site-header.tsx
// components/site-header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

function NavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={
        "text-sm px-3 py-2 rounded-lg font-medium transition-all " +
        (active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50")
      }
    >
      {label}
    </Link>
  );
}

export default function SiteHeader() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rebuilding, setRebuilding] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 다크모드 토글 버튼이 클라이언트에서만 렌더링되도록
  useEffect(() => {
    setMounted(true);
  }, []);

  const user = session?.user as any | undefined;
  const email = user?.email as string | undefined;
  const nickname = user?.nickname as string | undefined;
  const username = user?.username as string | undefined;
  const name = user?.name as string | undefined;
  const role = user?.role as string | undefined;
  const isAdmin = role === "admin";
  
  // 표시할 이름: nickname > username > name > email 순서
  const displayName = nickname || username || name || email || "로그인됨";

   // 🔥 정지된 계정은 자동 로그아웃
  useEffect(() => {
    if (user && user.isDisabled) {
      // 정지된 계정이면 강제로 로그아웃 + 에러 코드 전달
      signOut({ callbackUrl: "/auth/login?error=AccountDisabled" });
    }
  }, [user]); 

  // 🔔 안 읽은 알림 개수
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!session) {
      setUnreadCount(0);
      return;
    }

    let cancelled = false;

    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications/unread-count");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setUnreadCount(data.count ?? 0);
        }
      } catch (e) {
        console.error("Failed to fetch unread notifications", e);
      }
    };

    fetchUnread();

    // 30초마다 한 번씩 갱신
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [session]);

  async function handleRebuild() {
    try {
      setRebuilding(true);
      const res = await fetch("/api/rebuild", {
        method: "POST",
      });
      if (!res.ok) {
        alert("리빌드 실패");
      } else {
        alert("리빌드 완료!");
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert("리빌드 중 오류 발생");
    } finally {
      setRebuilding(false);
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container mx-auto h-16 flex items-center justify-between gap-4 px-4">
        {/* 왼쪽: 로고 */}
        <div className="flex items-center gap-6">
          <Link 
            href="/" 
            className="font-bold text-lg bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
          >
            TicketForum
          </Link>

          {/* 메인 네비게이션 */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/" label="달력" />
            <NavLink href="/board/notice" label="공지사항" />
            <NavLink href="/board/free" label="건의사항" />
            {session && (
              <NavLink
                href="/mypage"
                label={
                  unreadCount > 0
                    ? `마이페이지 (${unreadCount})`
                    : "마이페이지"
                }
              />
            )}
            {isAdmin && (
              <NavLink href="/admin" label="관리자" />
            )}
          </nav>
        </div>

        {/* 오른쪽: 로그인 / 사용자 정보 / 관리자 도구 */}
        <div className="flex items-center gap-2">
          {/* 다크모드 토글 버튼 */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg border hover:bg-muted transition-colors"
              aria-label="다크모드 토글"
            >
              <span className="text-base">
                {theme === "dark" ? "☀️" : "🌙"}
              </span>
            </button>
          )}

          {status === "loading" ? (
            <span className="text-sm text-muted-foreground px-3">
              로딩 중...
            </span>
          ) : session ? (
            <>
              <div className="hidden sm:flex flex-col items-end leading-tight px-3">
                <span className="text-sm font-medium">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {isAdmin ? "관리자" : "일반 사용자"}
                  {unreadCount > 0 && (
                    <span className="ml-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      · 새 알림 {unreadCount}개
                    </span>
                  )}
                </span>
              </div>

              {isAdmin && (
                <button
                  onClick={handleRebuild}
                  disabled={rebuilding}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-medium hover:from-amber-600 hover:to-amber-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {rebuilding ? "리빌드 중..." : "리빌드"}
                </button>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-3 py-1.5 rounded-lg border hover:bg-muted text-xs font-medium transition-colors"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/auth/login")}
                className="px-4 py-1.5 rounded-lg border hover:bg-muted text-sm font-medium transition-colors"
              >
                로그인
              </button>
              <button
                onClick={() => router.push("/auth/register")}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
              >
                회원가입
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
