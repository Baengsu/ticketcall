// C:\ticketcall\app\board\[slug]\[postID]\page.tsx
// app/board/[slug]/[postID]/page.tsx
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CommentsClient, {
  CommentItem,
} from "@/components/board/comments-client";
import PostContent from "@/components/board/post-content";

const NOTICE_SLUG = "notice";
// 🔥 건의사항 slug: /board/free 기준
const SUGGEST_SLUG = "free";
const DONE_PREFIX = "[완료] ";

interface PageProps {
  params: Promise<{
    slug: string;
    postID: string;
  }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug, postID } = await params;

  if (!slug || !postID) {
    notFound();
  }

  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const postIdNum = Number(postID);
  if (!Number.isFinite(postIdNum)) {
    notFound();
  }

  // 먼저 게시글이 존재하는지 확인
  const postExists = await prisma.post.findUnique({
    where: { id: postIdNum },
    select: { id: true, categoryId: true },
  });

  if (!postExists) {
    console.error(`[PostDetail] Post not found: postID=${postID}, slug=${slug}`);
    notFound();
  }

  // 조회수 증가 (페이지 로드 시 자동 증가)
  const post = await prisma.post.update({
    where: { id: postIdNum },
    data: {
      viewCount: {
        increment: 1,
      },
    },
    include: {
      author: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: true },
      },
      category: true,
    },
  });

  if (post.categoryId !== category.id) {
    console.error(`[PostDetail] Category mismatch: post.categoryId=${post.categoryId}, category.id=${category.id}, slug=${slug}`);
    notFound();
  }

  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";
  const isAuthor = !!currentUserId && currentUserId === post.authorId;

  const isNotice = slug === NOTICE_SLUG;
  const isSuggest = slug === SUGGEST_SLUG;

  // 🔥 숨김 처리된 글은 관리자만 접근 가능
  if (post.isHidden && !isAdmin) {
    console.error(`[PostDetail] Hidden post access denied: postID=${postID}, userId=${currentUserId}, isAdmin=${isAdmin}`);
    notFound();
  }

  // 🔥 건의사항: 작성자 + 관리자만 페이지 접근 가능
  if (isSuggest && !isAdmin && !isAuthor) {
    console.error(`[PostDetail] Suggest post access denied: postID=${postID}, slug=${slug}, userId=${currentUserId}, post.authorId=${post.authorId}, isAdmin=${isAdmin}, isAuthor=${isAuthor}`);
    // 건의사항은 작성자와 관리자만 볼 수 있으므로 404 대신 권한 없음 페이지로 리다이렉트
    redirect(`/board/${slug}?error=access_denied`);
  }

  const initialComments: CommentItem[] = post.comments.map((c: typeof post.comments[0]) => ({
    id: c.id,
    content: c.content,
    createdAt: c.createdAt.toISOString(),
    authorId: c.authorId,
    author: c.author
      ? {
          id: c.author.id,
          name: c.author.name,
        }
      : null,
  }));

  const isDone = post.title.startsWith(DONE_PREFIX);
  const displayTitle = post.title;
  const hasAdminReply = !!post.adminReply;

  return (
    <main className="container mx-auto py-10 space-y-6">
      <header className="space-y-1 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {displayTitle}
          </h1>
          <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
            <span>게시판: {category.name}</span>
            <span>작성자: {post.author?.name ?? "익명"}</span>
            <span>
              {post.createdAt.toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-1">
              👁️ 조회 {post.viewCount ?? 0}
            </span>
            {isNotice && post.isPinned && (
              <span className="font-semibold text-orange-600">
                상단 고정 공지
              </span>
            )}
            {post.isHidden && (
              <span className="font-semibold text-red-600">
                숨김 처리됨
              </span>
            )}
            {isSuggest && hasAdminReply && (
              <span className="font-semibold text-green-700">
                관리자 답변 완료
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* 🔥 공지 게시판: 관리자 전용 상단 고정/해제 버튼 */}
          {isNotice && isAdmin && (
            <form
              action={async () => {
                "use server";

                await prisma.post.update({
                  where: { id: post.id },
                  data: {
                    isPinned: !post.isPinned,
                  },
                });

                redirect(`/board/${slug}/${postID}`);
              }}
            >
              <button
                type="submit"
                className="text-sm px-3 py-1 rounded bg-yellow-600 text-white"
              >
                {post.isPinned ? "고정 해제" : "상단 고정"}
              </button>
            </form>
          )}

          {/* 🔥 관리자 전용: 건의사항 완료 표시 버튼 */}
          {isSuggest && isAdmin && !isDone && (
            <form
              action={async () => {
                "use server";

                const updated = await prisma.post.update({
                  where: { id: post.id },
                  data: {
                    title: post.title.startsWith(DONE_PREFIX)
                      ? post.title
                      : DONE_PREFIX + post.title,
                  },
                });

                // 🔔 알림: 건의 완료
                if (updated.authorId) {
                  await prisma.notification.create({
                    data: {
                      userId: updated.authorId,
                      type: "suggest_done",
                      message: `건의가 완료 처리되었습니다: "${post.title}"`,
                    },
                  });
                }

                redirect(`/board/${slug}/${postID}`);
              }}
            >
              <button
                type="submit"
                className="text-sm px-3 py-1 rounded bg-green-600 text-white"
              >
                완료 처리
              </button>
            </form>
          )}

          {/* 🔥 관리자 전용: 숨김/해제 버튼 */}
          {isAdmin && (
            <form
              action={async () => {
                "use server";

                await prisma.post.update({
                  where: { id: post.id },
                  data: {
                    isHidden: !post.isHidden,
                  },
                });

                redirect(`/board/${slug}`);
              }}
            >
              <button
                type="submit"
                className="text-sm px-3 py-1 rounded bg-gray-700 text-white"
              >
                {post.isHidden ? "숨김 해제" : "숨기기"}
              </button>
            </form>
          )}

          {/* 수정/삭제 버튼: 작성자 + 관리자 */}
          {(isAdmin || isAuthor) && (
            <>
              <form action={`/board/${slug}/${postID}/edit`}>
                <button
                  type="submit"
                  className="text-sm px-3 py-1 rounded bg-blue-600 text-white"
                >
                  수정
                </button>
              </form>

              <form
                action={async () => {
                  "use server";

                  await prisma.post.delete({
                    where: { id: post.id },
                  });

                  redirect(`/board/${slug}`);
                }}
              >
                <button
                  type="submit"
                  className="text-sm px-3 py-1 rounded bg-red-600 text-white"
                >
                  삭제
                </button>
              </form>
            </>
          )}

          {/* 🔥 로그인한 유저라면 신고 버튼 (게시글 신고) */}
          {currentUserId && !isAdmin && (
            <form
              action={async () => {
                "use server";

                await prisma.report.create({
                  data: {
                    targetType: "post",
                    postId: post.id,
                    reporterId: currentUserId,
                    reason: "사용자 신고",
                  },
                });

                // 신고 후에도 그대로 페이지 유지
              }}
            >
              <button
                type="submit"
                className="text-sm px-3 py-1 rounded border border-red-500 text-red-600"
              >
                신고
              </button>
            </form>
          )}
        </div>
      </header>

      {/* 본문 */}
      <section className="border rounded-md p-4 text-sm leading-relaxed space-y-4">
        <PostContent content={post.content} />

        {/* 🔥 건의사항 + 관리자 답변이 있는 경우, 답변 박스 */}
        {isSuggest && hasAdminReply && (
          <div className="mt-4 border-t pt-4 text-sm">
            <h2 className="font-semibold mb-1">관리자 답변</h2>
            <p className="whitespace-pre-wrap">{post.adminReply}</p>
            {post.adminRepliedAt && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                답변 시간:{" "}
                {post.adminRepliedAt.toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}

        {/* 🔥 관리자일 때: 답변 작성/수정 폼 */}
        {isSuggest && isAdmin && (
          <form
            action={async (formData: FormData) => {
              "use server";

              const reply = formData.get("adminReply");
              const replyText =
                typeof reply === "string" ? reply.trim() : "";

              const updated = await prisma.post.update({
                where: { id: post.id },
                data: {
                  adminReply: replyText.length > 0 ? replyText : null,
                  adminRepliedAt:
                    replyText.length > 0 ? new Date() : null,
                },
              });

              // 🔔 알림: 관리자 답변 등록
              if (updated.authorId && replyText.length > 0) {
                await prisma.notification.create({
                  data: {
                    userId: updated.authorId,
                    type: "admin_reply",
                    message: `건의에 대한 관리자 답변이 등록되었습니다: "${post.title}"`,
                  },
                });
              }

              redirect(`/board/${slug}/${postID}`);
            }}
            className="mt-6 space-y-2"
          >
            <label className="text-sm font-medium block">
              관리자 답변 작성/수정
            </label>
            <textarea
              name="adminReply"
              defaultValue={post.adminReply ?? ""}
              className="w-full border rounded-md p-2 text-sm min-h-[80px]"
              placeholder="사용자 건의에 대한 공식 답변을 입력하세요."
            />
            <button
              type="submit"
              className="text-sm px-3 py-1 rounded bg-black text-white"
            >
              답변 저장
            </button>
          </form>
        )}
      </section>

      {/* 댓글 섹션 */}
      <section className="space-y-4 border-top pt-4">
        <h2 className="text-sm font-semibold">댓글</h2>

        <CommentsClient
          postId={post.id}
          slug={slug}
          isNotice={isNotice}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          initialComments={initialComments}
        />
      </section>
    </main>
  );
}
