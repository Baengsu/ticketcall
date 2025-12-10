// C:\ticketcall\app\mypage\page.tsx
// app/mypage/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

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

  // 🔔 최근 알림 10개 가져오기
  const recentNotifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
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
    <main className="container mx-auto py-10 space-y-8">
      {/* 상단 프로필 요약 */}
      <section>
        <h1 className="text-2xl font-bold mb-2">마이페이지</h1>
        <p className="text-sm text-muted-foreground mb-4">
          TicketForum에서의 활동 내역과 건의사항 처리 현황을 확인할 수 있습니다.
        </p>

        <div className="border rounded-lg p-4 text-sm space-y-1 max-w-md">
          <p>
            <span className="font-medium">이메일: </span>
            {userEmail ?? "알 수 없음"}
          </p>
          <p>
            <span className="font-medium">권한: </span>
            {isAdmin ? "관리자" : "일반 사용자"}
          </p>
        </div>
      </section>

      {/* 🔔 최근 알림 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">최근 알림</h2>
        <div className="border rounded-lg p-4 text-sm max-w-xl">
          {recentNotifications.length === 0 ? (
            <p className="text-muted-foreground">
              아직 도착한 알림이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentNotifications.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start justify-between gap-2"
                >
                  <div>
                    <div>{n.message}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {n.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </div>
                  </div>
                  {!n.read && (
                    <span className="text-[10px] text-blue-600 font-semibold">
                      NEW
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 🔥 내 건의사항 요약 카드 */}
      <section className="space-y-2">
        <h2 className="text-lg font-semibold">내 건의사항 현황</h2>
        <div className="border rounded-lg p-4 text-sm max-w-md">
          {totalSuggest === 0 ? (
            <p className="text-muted-foreground">
              아직 작성한 건의사항이 없습니다.
            </p>
          ) : (
            <div className="space-y-1">
              <p>
                총 건의사항:{" "}
                <span className="font-semibold">{totalSuggest} 개</span>
              </p>
              <p>
                완료된 건의사항:{" "}
                <span className="font-semibold text-green-700">
                  {doneSuggest} 개
                </span>
              </p>
              <p>
                처리 대기 중:{" "}
                <span className="font-semibold text-orange-700">
                  {pendingSuggest} 개
                </span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                건의사항 게시판에서 제목이{" "}
                <span className="font-semibold">
                  {DONE_PREFIX}
                </span>
                로 시작하면 완료 처리된 건의입니다.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* 🔥 내 건의사항 목록 (대기 / 완료 분리) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">내 건의사항 목록</h2>

        {totalSuggest === 0 ? (
          <div className="border rounded-lg p-4 text-sm text-muted-foreground">
            아직 작성한 건의사항이 없습니다.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {/* 처리 대기 중 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b px-3 py-2 bg-muted/60 flex items-center justify-between">
                <span className="text-sm font-medium">처리 대기 중</span>
                <span className="text-xs text-muted-foreground">
                  {pendingSuggest} 개
                </span>
              </div>
              {pendingSuggestPosts.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  처리 대기 중인 건의사항이 없습니다.
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">제목</th>
                      <th className="px-3 py-2 text-left w-32">작성일</th>
                      <th className="px-3 py-2 text-left w-16">보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingSuggestPosts.map((post) => (
                      <tr key={post.id} className="border-t">
                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">{post.title}</div>
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                          {post.createdAt
                            .toISOString()
                            .slice(0, 16)
                            .replace("T", " ")}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <a
                            href={`/board/${post.category?.slug}/${post.id}`}
                            className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                          >
                            이동
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 완료된 건의 */}
            <div className="border rounded-lg overflow-hidden">
              <div className="border-b px-3 py-2 bg-muted/60 flex items-center justify-between">
                <span className="text-sm font-medium">완료된 건의사항</span>
                <span className="text-xs text-muted-foreground">
                  {doneSuggest} 개
                </span>
              </div>
              {doneSuggestPosts.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">
                  완료된 건의사항이 없습니다.
                </div>
              ) : (
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left">제목</th>
                      <th className="px-3 py-2 text-left w-32">작성일</th>
                      <th className="px-3 py-2 text-left w-16">보기</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doneSuggestPosts.map((post) => (
                      <tr key={post.id} className="border-t">
                        <td className="px-3 py-2 align-top">
                          <div className="line-clamp-2">{post.title}</div>
                        </td>
                        <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                          {post.createdAt
                            .toISOString()
                            .slice(0, 16)
                            .replace("T", " ")}
                        </td>
                        <td className="px-3 py-2 align-top">
                          <a
                            href={`/board/${post.category?.slug}/${post.id}`}
                            className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                          >
                            이동
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 내가 쓴 글 (전체) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">내가 쓴 글</h2>
        <div className="border rounded-lg overflow-hidden">
          {myPosts.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              아직 작성한 게시글이 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-32">게시판</th>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-left w-40">작성일</th>
                  <th className="px-3 py-2 text-left w-20">보기</th>
                </tr>
              </thead>
              <tbody>
                {myPosts.map((post) => (
                  <tr key={post.id} className="border-t">
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {post.category?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="line-clamp-2">{post.title}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {post.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <a
                        href={`/board/${post.category?.slug}/${post.id}`}
                        className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                      >
                        이동
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 내가 쓴 댓글 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">내가 쓴 댓글</h2>
        <div className="border rounded-lg overflow-hidden">
          {myComments.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              아직 작성한 댓글이 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-32">게시판</th>
                  <th className="px-3 py-2 text-left">댓글 내용</th>
                  <th className="px-3 py-2 text-left w-40">작성일</th>
                  <th className="px-3 py-2 text-left w-20">보기</th>
                </tr>
              </thead>
              <tbody>
                {myComments.map((comment) => (
                  <tr key={comment.id} className="border-t">
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {comment.post?.category?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="line-clamp-2">{comment.content}</div>
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {comment.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <a
                        href={`/board/${comment.post?.category?.slug}/${comment.postId}`}
                        className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                      >
                        이동
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
