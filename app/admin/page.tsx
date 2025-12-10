// C:\ticketcall\app\admin\page.tsx
"use client";

import { useEffect, useState } from "react";

type RebuildLog = {
  id: string;
  createdAt: string;
  status: string;
  message: string;
  userEmail: string | null;
};

type PostSummary = {
  id: number;
  title: string;
  createdAt: string;
  categoryName: string;
  categorySlug: string;
  isPinned: boolean;
  isHidden: boolean;
};

export default function AdminPage() {
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [loadingOnline, setLoadingOnline] = useState(true);

  const [logs, setLogs] = useState<RebuildLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [pinnedNotices, setPinnedNotices] = useState<PostSummary[]>([]);
  const [hiddenPosts, setHiddenPosts] = useState<PostSummary[]>([]);
  const [loadingPostsSummary, setLoadingPostsSummary] = useState(true);

  // 실시간 접속자 수
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/online-count");
        const data = await res.json();
        setOnlineCount(data.count);
      } catch (error) {
        console.error("Failed to fetch /api/online-count", error);
      } finally {
        setLoadingOnline(false);
      }
    };

    fetchCount();

    // 5초마다 접속자 수 갱신
    const interval = setInterval(fetchCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // 리빌드 로그 조회
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/admin/rebuild-logs");
        if (!res.ok) {
          console.error("Failed to fetch rebuild logs");
          return;
        }
        const data = await res.json();
        setLogs(data.logs ?? []);
      } catch (error) {
        console.error("Error fetching rebuild logs", error);
      } finally {
        setLoadingLogs(false);
      }
    };

    fetchLogs();
  }, []);

  // 🔥 게시글 요약(고정 공지 + 숨김 글) 조회
  useEffect(() => {
    const fetchPostsSummary = async () => {
      try {
        const res = await fetch("/api/admin/posts-summary");
        if (!res.ok) {
          console.error("Failed to fetch posts summary");
          return;
        }
        const data = await res.json();
        setPinnedNotices(data.pinnedNotices ?? []);
        setHiddenPosts(data.hiddenPosts ?? []);
      } catch (error) {
        console.error("Error fetching posts summary", error);
      } finally {
        setLoadingPostsSummary(false);
      }
    };

    fetchPostsSummary();
  }, []);

  return (
    <main className="p-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          TicketForum 운영을 위한 관리자 전용 페이지입니다.
        </p>
      </header>

      {/* 상단 카드들 */}
      <section className="grid gap-4 md:grid-cols-2">
        {/* 실시간 접속자 수 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">실시간 접속자 수</h2>
          {loadingOnline ? (
            <p>불러오는 중...</p>
          ) : (
            <p className="text-xl">
              현재 접속 중인 사용자 수:{" "}
              <span className="font-bold">
                {onlineCount !== null ? `${onlineCount} 명` : "알 수 없음"}
              </span>
            </p>
          )}
        </div>

        {/* 리빌드 요약 카드 (최근 1건 기준) */}
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">최근 리빌드 상태</h2>
          {loadingLogs ? (
            <p>로그 불러오는 중...</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              아직 리빌드 로그가 없습니다.
            </p>
          ) : (
            (() => {
              const latest = logs[0];
              return (
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">시간: </span>
                    {new Date(latest.createdAt).toLocaleString("ko-KR")}
                  </p>
                  <p>
                    <span className="font-medium">상태: </span>
                    {latest.status === "success" ? "성공" : "실패"}
                  </p>
                  <p>
                    <span className="font-medium">실행자: </span>
                    {latest.userEmail ?? "-"}
                  </p>
                  <p className="text-muted-foreground mt-1">
                    {latest.message}
                  </p>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* 🔥 고정 공지 & 숨김 글 요약 카드 */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">고정 공지 현황</h2>
          {loadingPostsSummary ? (
            <p>불러오는 중...</p>
          ) : pinnedNotices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              상단 고정된 공지가 없습니다.
            </p>
          ) : (
            <ul className="space-y-1 text-sm">
              {pinnedNotices.slice(0, 5).map((post) => (
                <li key={post.id} className="flex justify-between gap-2">
                  <div className="flex-1">
                    <div className="font-medium truncate">
                      [{post.categoryName}] {post.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString("ko-KR")}
                    </div>
                  </div>
                  <a
                    href={`/board/${post.categorySlug}/${post.id}`}
                    className="text-[11px] px-2 py-1 rounded border hover:bg-muted whitespace-nowrap"
                  >
                    이동
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">숨김 처리된 게시글</h2>
          {loadingPostsSummary ? (
            <p>불러오는 중...</p>
          ) : hiddenPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              숨김 처리된 게시글이 없습니다.
            </p>
          ) : (
            <p className="text-sm">
              총{" "}
              <span className="font-semibold">
                {hiddenPosts.length} 개
              </span>{" "}
             의 게시글이 숨김 처리되어 있습니다.
            </p>
          )}
        </div>
      </section>

      {/* 리빌드 로그 테이블 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">크롤링 리빌드 로그</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">시간</th>
                <th className="px-3 py-2 text-left">상태</th>
                <th className="px-3 py-2 text-left">요약 메시지</th>
                <th className="px-3 py-2 text-left">실행자</th>
              </tr>
            </thead>
            <tbody>
              {loadingLogs ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    로그 불러오는 중...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    기록된 리빌드 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t">
                    <td className="px-3 py-2 align-top">
                      {new Date(log.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-3 py-2 align-top">
                      {log.status === "success" ? "성공" : "실패"}
                    </td>
                    <td className="px-3 py-2 align-top">{log.message}</td>
                    <td className="px-3 py-2 align-top">
                      {log.userEmail ?? "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <a
  href="/admin/users"
  className="text-sm px-3 py-2 rounded-md border hover:bg-muted inline-block"
>
  회원 관리로 이동
</a>

<a
  href="/admin/etc-events"
  className="text-xs px-3 py-2 rounded-md border hover:bg-muted inline-block"
>
  직접 공연 일정 관리
</a>


      {/* 🔥 숨김 처리된 게시글 상세 목록 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">숨김 처리된 게시글 목록</h2>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">게시판</th>
                <th className="px-3 py-2 text-left">제목</th>
                <th className="px-3 py-2 text-left w-40">작성일</th>
                <th className="px-3 py-2 text-left w-20">보기</th>
              </tr>
            </thead>
            <tbody>
              {loadingPostsSummary ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    불러오는 중...
                  </td>
                </tr>
              ) : hiddenPosts.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-4 text-center text-muted-foreground"
                  >
                    숨김 처리된 게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                hiddenPosts.map((post) => (
                  <tr key={post.id} className="border-t">
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {post.categoryName}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="line-clamp-2">{post.title}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {new Date(post.createdAt).toLocaleString("ko-KR")}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <a
                        href={`/board/${post.categorySlug}/${post.id}`}
                        className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                      >
                        이동
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
