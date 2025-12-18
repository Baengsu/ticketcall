// C:\ticketcall\app\admin\users\[userId]\page.tsx
// app/admin/users/[userId]/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";

interface PageProps {
  params: Promise<{
    userId: string;
  }>;
}

const SUGGEST_SLUG = "free";

export default async function AdminUserDetailPage({ params }: PageProps) {
  // 🔥 params에서 userId 안전하게 꺼내기
    const { userId } = await params;

  // userId가 아예 없으면 404 처리
  if (!userId) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;

  // 관리자만 접근 가능
  if (!currentUser || currentUser.role !== "admin") {
    redirect("/");
  }

  // 🔧 계정 정지 / 해제 서버 액션
  async function toggleUserDisable(formData: FormData) {
    "use server";

    const targetId = String(formData.get("userId") ?? "");
    const action = String(formData.get("action") ?? "");

    if (!targetId) {
      redirect(`/admin/users/${userId}`);
    }

    if (action === "disable") {
      await prisma.user.update({
        where: { id: targetId },
        data: {
          isDisabled: true,
          bannedAt: new Date(),
        },
      });
    } else if (action === "enable") {
      await prisma.user.update({
        where: { id: targetId },
        data: {
          isDisabled: false,
          bannedAt: null,
          banReason: null,
        },
      });
    }

    redirect(`/admin/users/${userId}`);
  }

  // 🔧 게시글 삭제 서버 액션
  async function deletePostAction(formData: FormData) {
    "use server";

    const postIdStr = String(formData.get("postId") ?? "");
    const postId = Number(postIdStr);
    if (!postId || Number.isNaN(postId)) {
      redirect(`/admin/users/${userId}`);
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    redirect(`/admin/users/${userId}`);
  }

  // 🔧 댓글 삭제 서버 액션
  async function deleteCommentAction(formData: FormData) {
    "use server";

    const commentIdStr = String(formData.get("commentId") ?? "");
    const commentId = Number(commentIdStr);
    if (!commentId || Number.isNaN(commentId)) {
      redirect(`/admin/users/${userId}`);
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    redirect(`/admin/users/${userId}`);
  }

  // 🔥 여기서 userId는 절대 undefined 아님 (위에서 notFound 처리)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isDisabled: true,
      bannedAt: true,
      banReason: true,
      posts: {
        select: {
          id: true,
          title: true,
          createdAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
      comments: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          postId: true,
          post: {
            select: {
              id: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!user) {
    notFound();
  }

  const postCount = user.posts.length;
  const commentCount = user.comments.length;
  const isDisabled = user.isDisabled;

  // 🔥 이 유저의 건의사항 글만 필터 (slug = "free")
  const suggestPosts = user.posts.filter(
    (p: typeof user.posts[0]) => p.category?.slug === SUGGEST_SLUG
  );
  const suggestCount = suggestPosts.length;

  return (
    <main className="max-w-5xl mx-auto py-10 space-y-8">
      {/* 상단 요약 + 계정 정지/해제 버튼 */}
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">회원 활동 상세</h1>
        <p className="text-sm text-muted-foreground">
          선택한 회원이 작성한 게시글과 댓글 활동 내역입니다. 여기서 계정 정지 및
          글/댓글 삭제를 수행할 수 있습니다.
        </p>
        <div className="border rounded-lg p-3 text-sm space-y-1">
          <div>
            <span className="font-medium">이메일: </span>
            {user.email ?? "-"}
          </div>
          <div>
            <span className="font-medium">이름: </span>
            {user.name ?? "이름 없음"}
          </div>
          <div>
            <span className="font-medium">권한: </span>
            {user.role === "admin" ? "관리자" : "일반 사용자"}
          </div>
          <div className="flex flex-wrap gap-2 items-center pt-2 text-xs">
            <span className="text-muted-foreground">
              글 {postCount}개 · 댓글 {commentCount}개 · 건의사항{" "}
              <span className="font-semibold text-foreground">
                {suggestCount}개
              </span>
            </span>
            {isDisabled ? (
              <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                정지된 계정
              </span>
            ) : (
              <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                활성 계정
              </span>
            )}
          </div>
          {user.bannedAt && (
            <div className="text-[11px] text-muted-foreground">
              정지 일시:{" "}
              {user.bannedAt.toISOString().slice(0, 16).replace("T", " ")}
            </div>
          )}
          {user.banReason && (
            <div className="text-[11px] text-muted-foreground">
              사유: {user.banReason}
            </div>
          )}

          {/* 🔥 계정 정지 / 해제 버튼 */}
          <div className="pt-3 flex gap-2 text-xs">
            {isDisabled ? (
              <form action={toggleUserDisable}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="enable" />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-md border hover:bg-muted"
                >
                  계정 정지 해제
                </button>
              </form>
            ) : (
              <form action={toggleUserDisable}>
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="action" value="disable" />
                <button
                  type="submit"
                  className="px-3 py-1 rounded-md bg-red-600 text-white hover:bg-red-700"
                >
                  계정 정지
                </button>
              </form>
            )}
          </div>

          <div className="text-xs pt-1 text-muted-foreground">
            계정 정지 시 다시 로그인할 수 없습니다.
          </div>
        </div>

        <div className="text-xs">
          <a
            href="/admin/users"
            className="inline-flex mt-2 px-3 py-1 rounded-md border hover:bg-muted"
          >
            ← 회원 목록으로 돌아가기
          </a>
        </div>
      </header>

      {/* 🔥 이 회원의 건의사항 글만 별도 섹션 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">이 회원의 건의사항 글</h2>
        <div className="border rounded-lg overflow-hidden">
          {suggestCount === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              건의사항 게시판에 작성한 글이 없습니다.
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-left w-40">작성일</th>
                  <th className="px-3 py-2 text-left w-24">관리</th>
                </tr>
              </thead>
               <tbody>
                 {suggestPosts.map((post: typeof suggestPosts[0]) => (
                  <tr key={post.id} className="border-t align-top">
                    <td className="px-3 py-2 align-top">
                      <div className="line-clamp-2 text-sm">
                        {post.title}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                      {post.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 align-top space-y-1">
                      <a
                        href={`/board/${post.category?.slug}/${post.id}`}
                        className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                      >
                        이동
                      </a>
                      <form action={deletePostAction}>
                        <input
                          type="hidden"
                          name="postId"
                          value={post.id}
                        />
                        <button
                          type="submit"
                          className="mt-1 text-[11px] px-2 py-1 rounded border border-red-400 text-red-600 hover:bg-red-50 inline-block"
                        >
                          글 삭제
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 작성한 게시글 (전체) */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">작성한 게시글 (전체)</h2>
        <div className="border rounded-lg overflow-hidden">
          {postCount === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              아직 작성한 게시글이 없습니다.
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-40">게시판</th>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-left w-40">작성일</th>
                  <th className="px-3 py-2 text-left w-24">관리</th>
                </tr>
              </thead>
               <tbody>
                 {user.posts.map((post: typeof user.posts[0]) => (
                  <tr key={post.id} className="border-t align-top">
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {post.category?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="line-clamp-2 text-sm">
                        {post.title}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                      {post.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 align-top space-y-1">
                      <a
                        href={`/board/${post.category?.slug}/${post.id}`}
                        className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                      >
                        이동
                      </a>
                      <form action={deletePostAction}>
                        <input
                          type="hidden"
                          name="postId"
                          value={post.id}
                        />
                        <button
                          type="submit"
                          className="mt-1 text-[11px] px-2 py-1 rounded border border-red-400 text-red-600 hover:bg-red-50 inline-block"
                        >
                          글 삭제
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 작성한 댓글 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">작성한 댓글</h2>
        <div className="border rounded-lg overflow-hidden">
          {commentCount === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              아직 작성한 댓글이 없습니다.
            </div>
          ) : (
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-40">게시판</th>
                  <th className="px-3 py-2 text-left">댓글 내용</th>
                  <th className="px-3 py-2 text-left w-40">작성일</th>
                  <th className="px-3 py-2 text-left w-24">관리</th>
                </tr>
              </thead>
               <tbody>
                 {user.comments.map((comment: typeof user.comments[0]) => (
                  <tr key={comment.id} className="border-t align-top">
                    <td className="px-3 py-2 align-top whitespace-nowrap">
                      {comment.post?.category?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="line-clamp-2 text-sm">
                        {comment.content}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                      {comment.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 align-top space-y-1">
                      <a
                        href={`/board/${comment.post?.category?.slug}/${comment.postId}`}
                        className="text-[11px] px-2 py-1 rounded border hover:bg-muted inline-block"
                      >
                        이동
                      </a>
                      <form action={deleteCommentAction}>
                        <input
                          type="hidden"
                          name="commentId"
                          value={comment.id}
                        />
                        <button
                          type="submit"
                          className="mt-1 text-[11px] px-2 py-1 rounded border border-red-400 text-red-600 hover:bg-red-50 inline-block"
                        >
                          댓글 삭제
                        </button>
                      </form>
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
