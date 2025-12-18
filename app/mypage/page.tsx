// C:\ticketcall\app\mypage\page.tsx
// app/mypage/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import NotificationsList from "@/components/mypage/notifications-list";

const SUGGEST_SLUG = "free";
const DONE_PREFIX = "[완료] ";

export default async function MyPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user?.id) {
    return (
      <main className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-4">마이페이지</h1>
        <p className="text-sm text-muted-foreground">
          마이페이지를 보려면 로그인이 필요합니다.
        </p>
        <a
          href="/auth/login"
          className="inline-flex mt-4 px-4 py-2 rounded-md bg-black text-white text-sm"
        >
          로그인하러 가기
        </a>
      </main>
    );
  }

  const userId = user.id as string;
  const userEmail = user.email as string | undefined;
  const role = (user.role as string | undefined) ?? "user";
  const isAdmin = role === "admin";

  // 🔔 최근 알림 가져오기 (최신 50개)
  const recentNotifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 🔔 마이페이지 입장 시 내 모든 알림을 읽음 처리
  await prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });

  // 내가 쓴 글들 (최신 50개로 살짝 늘려줌)
  const myPosts = await prisma.post.findMany({
    where: {
      authorId: userId,
    },
    include: {
      category: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  // 내가 쓴 댓글들 (최신 50개)
  const myComments = await prisma.comment.findMany({
    where: {
      authorId: userId,
    },
    include: {
      post: {
        include: {
          category: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  // 🔥 내가 쓴 건의사항(게시판 slug = "free"), 숨김 글은 제외
  const mySuggestPosts = myPosts.filter(
    (post) => post.category?.slug === SUGGEST_SLUG && !post.isHidden
  );

  const totalSuggest = mySuggestPosts.length;
  const doneSuggestPosts = mySuggestPosts.filter((post) =>
    post.title.startsWith(DONE_PREFIX)
  );
  const pendingSuggestPosts = mySuggestPosts.filter(
    (post) => !post.title.startsWith(DONE_PREFIX)
  );

  const doneSuggest = doneSuggestPosts.length;
  const pendingSuggest = pendingSuggestPosts.length;

  return (
    <main className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-8">
        {/* 상단 프로필 요약 */}
        <section>
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <span className="text-xl">👤</span>
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                마이페이지
              </h1>
            </div>
            <p className="text-sm text-muted-foreground">
              TicketForum에서의 활동 내역과 건의사항 처리 현황을 확인할 수 있습니다.
            </p>
          </div>

          <div className="border rounded-xl p-6 bg-gradient-to-br from-card to-card/95 shadow-md hover:shadow-lg transition-shadow duration-200 max-w-md backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center border border-blue-200/50 dark:border-blue-800/50">
                <span className="text-2xl">👤</span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base">
                  {userEmail ?? "알 수 없음"}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    isAdmin 
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                      : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                  }`}>
                    {isAdmin ? "관리자" : "일반 사용자"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

      {/* 🔔 최근 알림 */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <span className="text-lg">🔔</span>
          </div>
          <h2 className="text-lg font-semibold">알림</h2>
        </div>
        <div className="border rounded-xl p-4 bg-gradient-to-br from-card to-card/95 shadow-md hover:shadow-lg transition-shadow duration-200 max-w-2xl backdrop-blur-sm">
          <NotificationsList
            notifications={recentNotifications.map((n) => ({
              id: n.id,
              message: n.message,
              createdAt: n.createdAt,
              read: n.read,
            }))}
          />
        </div>
      </section>

      {/* 🔥 내 건의사항 요약 카드 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <span className="text-lg">💬</span>
          </div>
          <h2 className="text-xl font-semibold">내 건의사항 현황</h2>
        </div>
        <div className="border rounded-xl p-6 bg-gradient-to-br from-card to-card/95 shadow-md hover:shadow-lg transition-shadow duration-200 max-w-md backdrop-blur-sm">
          {totalSuggest === 0 ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-muted-foreground">
                아직 작성한 건의사항이 없습니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{totalSuggest}</p>
                  <p className="text-xs text-muted-foreground mt-1">전체</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                  <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {doneSuggest}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">완료</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                  <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {pendingSuggest}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">대기</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground pt-2 border-t">
                💡 건의사항 게시판에서 제목이{" "}
                <span className="font-semibold">{DONE_PREFIX}</span>
                로 시작하면 완료 처리된 건의입니다.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 🔥 내 건의사항 목록 (대기 / 완료 분리) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">내 건의사항 목록</h2>

        {totalSuggest === 0 ? (
          <div className="border rounded-xl p-8 text-center bg-card shadow-sm">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-muted-foreground">아직 작성한 건의사항이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {/* 처리 대기 중 */}
            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="border-b px-4 py-3 bg-orange-50 dark:bg-orange-900/20 flex items-center justify-between">
                <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">처리 대기 중</span>
                <span className="text-xs font-medium text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded-full">
                  {pendingSuggest} 개
                </span>
              </div>
              {pendingSuggestPosts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  처리 대기 중인 건의사항이 없습니다.
                </div>
              ) : (
                <div className="divide-y">
                  {pendingSuggestPosts.map((post) => (
                    <div key={post.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium line-clamp-2 mb-1">
                            {post.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        <a
                          href={`/board/${post.category?.slug}/${post.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg border hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                        >
                          보기
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 완료된 건의 */}
            <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="border-b px-4 py-3 bg-green-50 dark:bg-green-900/20 flex items-center justify-between">
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">완료된 건의사항</span>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                  {doneSuggest} 개
                </span>
              </div>
              {doneSuggestPosts.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  완료된 건의사항이 없습니다.
                </div>
              ) : (
                <div className="divide-y">
                  {doneSuggestPosts.map((post) => (
                    <div key={post.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium line-clamp-2 mb-1">
                            {post.title}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                          </p>
                        </div>
                        <a
                          href={`/board/${post.category?.slug}/${post.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg border hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                        >
                          보기
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 내가 쓴 글 (전체) */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">내가 쓴 글</h2>
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          {myPosts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">✍️</div>
              <p className="text-sm text-muted-foreground">아직 작성한 게시글이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y">
              {myPosts.map((post) => (
                <div key={post.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {post.category?.name ?? "-"}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium line-clamp-2 mb-1">
                        {post.title}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <a
                      href={`/board/${post.category?.slug}/${post.id}`}
                      className="text-xs px-3 py-1.5 rounded-lg border hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                    >
                      보기
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 내가 쓴 댓글 */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">내가 쓴 댓글</h2>
        <div className="border rounded-xl overflow-hidden bg-card shadow-sm">
          {myComments.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">💬</div>
              <p className="text-sm text-muted-foreground">아직 작성한 댓글이 없습니다.</p>
            </div>
          ) : (
            <div className="divide-y">
              {myComments.map((comment) => (
                <div key={comment.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">
                          {comment.post?.category?.name ?? "-"}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-2 mb-1">{comment.content}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(comment.createdAt).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                    <a
                      href={`/board/${comment.post?.category?.slug}/${comment.postId}`}
                      className="text-xs px-3 py-1.5 rounded-lg border hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap"
                    >
                      보기
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      </div>
    </main>
  );
}
