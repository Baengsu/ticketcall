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
    <main className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="space-y-8">
        <header className="pb-6 border-b">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">⚙️</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-red-600 to-orange-600 text-transparent bg-clip-text">
              Admin Dashboard
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            TicketForum 운영을 위한 관리자 전용 페이지입니다.
          </p>
        </header>

        {/* 상단 카드들 */}
        <section className="grid gap-6 md:grid-cols-2">
          {/* 실시간 접속자 수 */}
          <div className="border rounded-xl p-6 bg-gradient-to-br from-card to-card/95 shadow-md hover:shadow-lg transition-shadow duration-200 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
                <span className="text-xl">👥</span>
              </div>
              <h2 className="text-lg font-semibold">실시간 접속자 수</h2>
            </div>
            {loadingOnline ? (
              <p className="text-muted-foreground">불러오는 중...</p>
            ) : (
              <div className="space-y-2">
                <p className="text-3xl font-bold">
                  {onlineCount !== null ? onlineCount : "?"}
                </p>
                <p className="text-sm text-muted-foreground">명</p>
              </div>
            )}
          </div>

          {/* 리빌드 요약 카드 (최근 1건 기준) */}
          <div className="border rounded-xl p-6 bg-gradient-to-br from-card to-card/95 shadow-md hover:shadow-lg transition-shadow duration-200 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50">
                <span className="text-xl">⚙️</span>
              </div>
              <h2 className="text-lg font-semibold">최근 리빌드 상태</h2>
            </div>
            {loadingLogs ? (
              <p className="text-muted-foreground">로그 불러오는 중...</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                아직 리빌드 로그가 없습니다.
              </p>
            ) : (
              (() => {
                const latest = logs[0];
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        latest.status === "success"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                      }`}>
                        {latest.status === "success" ? "성공" : "실패"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(latest.createdAt).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">실행자: </span>
                      {latest.userEmail ?? "-"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {latest.message}
                    </p>
                  </div>
                );
              })()
            )}
          </div>
        </section>

      {/* 🔥 고정 공지 & 숨김 글 요약 카드 */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="border rounded-xl p-6 bg-gradient-to-br from-card to-card/95 shadow-md hover:shadow-lg transition-shadow duration-200 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-200/50 dark:border-purple-800/50">
              <span className="text-xl">📌</span>
            </div>
            <h2 className="text-lg font-semibold">고정 공지 현황</h2>
          </div>
          {loadingPostsSummary ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : pinnedNotices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              상단 고정된 공지가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {pinnedNotices.slice(0, 5).map((post) => (
                <li key={post.id} className="p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate mb-1">
                        [{post.categoryName}] {post.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </div>
                    </div>
                    <a
                      href={`/board/${post.categorySlug}/${post.id}`}
                      className="text-xs px-2 py-1 rounded-lg border hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                    >
                      이동
                    </a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border rounded-xl p-6 bg-gradient-to-br from-card to-card/95 shadow-md hover:shadow-lg transition-shadow duration-200 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-rose-500/20 flex items-center justify-center border border-red-200/50 dark:border-red-800/50">
              <span className="text-xl">🔒</span>
            </div>
            <h2 className="text-lg font-semibold">숨김 처리된 게시글</h2>
          </div>
          {loadingPostsSummary ? (
            <p className="text-muted-foreground">불러오는 중...</p>
          ) : hiddenPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              숨김 처리된 게시글이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-3xl font-bold">{hiddenPosts.length}</p>
              <p className="text-sm text-muted-foreground">개의 게시글이 숨김 처리되어 있습니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* 리빌드 로그 테이블 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <span className="text-lg">📋</span>
          </div>
          <h2 className="text-xl font-semibold">크롤링 리빌드 로그</h2>
        </div>
        <div className="border rounded-xl overflow-hidden bg-gradient-to-br from-card to-card/95 shadow-md backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">시간</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-left font-semibold">요약 메시지</th>
                  <th className="px-4 py-3 text-left font-semibold">실행자</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingLogs ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      로그 불러오는 중...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      기록된 리빌드 로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 align-top">
                        {new Date(log.createdAt).toLocaleString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          log.status === "success"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                        }`}>
                          {log.status === "success" ? "성공" : "실패"}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">{log.message}</td>
                      <td className="px-4 py-3 align-top text-muted-foreground">
                        {log.userEmail ?? "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 빠른 링크 */}
      <section className="flex flex-wrap gap-3">
        <a
          href="/admin/users"
          className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
        >
          👥 회원 관리
        </a>
        <a
          href="/admin/etc-events"
          className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
        >
          📅 직접 공연 일정 관리
        </a>
        <a
          href="/admin/reports"
          className="px-4 py-2 rounded-lg border hover:bg-muted transition-colors text-sm font-medium"
        >
          🚨 신고 관리
        </a>
      </section>

      {/* 🔥 숨김 처리된 게시글 상세 목록 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">숨김 처리된 게시글 목록</h2>
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">게시판</th>
                  <th className="px-4 py-3 text-left font-semibold">제목</th>
                  <th className="px-4 py-3 text-left font-semibold w-40">작성일</th>
                  <th className="px-4 py-3 text-left font-semibold w-20">보기</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingPostsSummary ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      불러오는 중...
                    </td>
                  </tr>
                ) : hiddenPosts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      숨김 처리된 게시글이 없습니다.
                    </td>
                  </tr>
                ) : (
                  hiddenPosts.map((post) => (
                    <tr key={post.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-4 py-3 align-top whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-muted text-xs">
                          {post.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="line-clamp-2">{post.title}</div>
                      </td>
                      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <a
                          href={`/board/${post.categorySlug}/${post.id}`}
                          className="text-xs px-2 py-1 rounded-lg border hover:bg-primary hover:text-primary-foreground transition-colors inline-block"
                        >
                          보기
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
