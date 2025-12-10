// C:\ticketcall\components\site-header.tsx
// components/site-header.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";

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
        "text-sm px-3 py-2 rounded-md transition " +
        (active
          ? "bg-black text-white"
          : "text-muted-foreground hover:bg-muted")
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

  const user = session?.user as any | undefined;
  const email = user?.email as string | undefined;
  const role = user?.role as string | undefined;
  const isAdmin = role === "admin";

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
    <header className="border-b bg-background">
      <div className="container mx-auto h-14 flex items-center justify-between gap-4">
        {/* 왼쪽: 로고 */}
        <div className="flex items-center gap-3">
          <Link href="/" className="font-semibold text-sm">
            TicketForum
          </Link>

          {/* 메인 네비게이션 */}
          <nav className="flex items-center gap-1">
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
        <div className="flex items-center gap-3 text-xs">
          {status === "loading" ? (
            <span className="text-muted-foreground">
              세션 확인 중...
            </span>
          ) : session ? (
            <>
              <div className="flex flex-col items-end leading-tight">
                <span className="font-medium">
                  {email ?? "로그인됨"}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {isAdmin ? "관리자" : "일반 사용자"}
                  {unreadCount > 0 && (
                    <span className="ml-1 text-[11px] text-blue-600">
                      · 새 알림 {unreadCount}개
                    </span>
                  )}
                </span>
              </div>

              {isAdmin && (
                <button
                  onClick={handleRebuild}
                  disabled={rebuilding}
                  className="px-2 py-1 rounded-md bg-amber-500 text-white text-[11px] disabled:opacity-60"
                >
                  {rebuilding ? "리빌드 중..." : "크롤링 리빌드"}
                </button>
              )}

              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="px-2 py-1 rounded-md border text-[11px]"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/auth/login")}
                className="px-2 py-1 rounded-md border text-[11px]"
              >
                로그인
              </button>
              <button
                onClick={() => router.push("/auth/register")}
                className="px-2 py-1 rounded-md bg-black text-white text-[11px]"
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
