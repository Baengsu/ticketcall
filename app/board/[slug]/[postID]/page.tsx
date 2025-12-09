// app/board/[slug]/[postID]/page.tsx
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CommentsClient, {
  CommentItem,
} from "@/components/board/comments-client";

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

  const post = await prisma.post.findUnique({
    where: { id: postIdNum },
    include: {
      author: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: true },
      },
      category: true,
    },
  });

  if (!post || post.categoryId !== category.id) {
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

  // 🔥 건의사항: 작성자 + 관리자만 페이지 접근 가능
  if (isSuggest && !isAdmin && !isAuthor) {
    notFound();
  }

  const initialComments: CommentItem[] = post.comments.map((c) => ({
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
              {post.createdAt.toISOString().slice(0, 16).replace("T", " ")}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {/* 🔥 관리자 전용: 완료 표시 버튼 (건의사항일 때만) */}
          {isSuggest && isAdmin && !isDone && (
            <form
              action={async () => {
                "use server";

                await prisma.post.update({
                  where: { id: post.id },
                  data: {
                    title: post.title.startsWith(DONE_PREFIX)
                      ? post.title
                      : DONE_PREFIX + post.title,
                  },
                });

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
        </div>
      </header>

      {/* 본문 */}
      <section className="border rounded-md p-4 whitespace-pre-wrap text-sm leading-relaxed">
        {post.content}
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
