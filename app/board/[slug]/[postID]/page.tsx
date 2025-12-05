// app/board/[slug]/[postID]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const NOTICE_SLUG = "notice";
const SUGGEST_SLUG = "suggest";

interface PageProps {
  params: Promise<{
    slug: string;
    postID: string;
  }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  // ✅ Next 16: params는 Promise라서 await 필요
  const { slug, postID } = await params;

  if (!slug || !postID) {
    notFound();
  }

  // 1) 게시판(카테고리) 찾기
  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  // 2) postID → 숫자로 변환
  const postIdNum = Number(postID);
  if (!Number.isFinite(postIdNum)) {
    notFound();
  }

  // 3) 글 + 작성자 + 댓글까지 같이 조회
  const post = await prisma.post.findUnique({
    where: { id: postIdNum },
    include: {
      author: true,
      comments: {
        orderBy: { createdAt: "asc" },
        include: { author: true },
      },
    },
  });

  if (!post || post.categoryId !== category.id) {
    notFound();
  }

  // 4) 로그인/권한 정보
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";
  const isAuthor = !!currentUserId && currentUserId === post.authorId;

  const isNotice = slug === NOTICE_SLUG;
  const isSuggest = slug === SUGGEST_SLUG;

  // ✅ 건의사항: 작성자 + 관리자만 본문 열람 가능
  const canViewContent = !isSuggest || isAdmin || isAuthor;

  return (
    <main className="container mx-auto py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{post.title}</h1>
        <div className="text-xs text-muted-foreground flex gap-2">
          <span>게시판: {category.name}</span>
          <span>작성자: {post.author?.name ?? "익명"}</span>
          <span>{post.createdAt.toISOString().slice(0, 16).replace("T", " ")}</span>
        </div>
      </header>

      {/* 건의사항 권한 체크 */}
      {isSuggest && !canViewContent ? (
        <section className="border rounded-md p-4 bg-muted/40">
          <p className="text-sm text-muted-foreground">
            이 글의 내용은 작성자와 관리자만 열람할 수 있습니다.
          </p>
        </section>
      ) : (
        <section className="border rounded-md p-4 whitespace-pre-wrap text-sm leading-relaxed">
          {post.content}
        </section>
      )}

      {/* 댓글 영역 */}
      {isNotice ? (
        <section className="border-t pt-4 text-sm text-muted-foreground">
          공지사항에는 댓글을 달 수 없습니다.
        </section>
      ) : (
        <section className="space-y-4 border-t pt-4">
          <h2 className="text-sm font-semibold">댓글</h2>

          {/* 댓글 목록 */}
          {post.comments.length === 0 ? (
            <p className="text-xs text-muted-foreground">아직 댓글이 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {post.comments.map((comment) => (
                <li
                  key={comment.id}
                  className="border rounded-md px-3 py-2 text-sm space-y-1"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{comment.author?.name ?? "익명"}</span>
                    <span>
                      {comment.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                </li>
              ))}
            </ul>
          )}

          {/* 댓글 작성 폼 – 로그인 한 유저만 */}
          {currentUserId ? (
            <form
              action={async (formData) => {
                "use server";
                const content = formData.get("content");
                if (typeof content !== "string" || !content.trim()) return;

                await prisma.comment.create({
                  data: {
                    content: content.trim(),
                    postId: post.id,
                    authorId: currentUserId,
                  },
                });
              }}
              className="space-y-2"
            >
              <textarea
                name="content"
                className="w-full border rounded px-2 py-1 text-sm min-h-[80px]"
                placeholder="댓글을 입력하세요."
              />
              <button
                type="submit"
                className="px-3 py-1 rounded-md bg-primary text-primary-foreground text-xs"
              >
                댓글 등록
              </button>
            </form>
          ) : (
            <p className="text-xs text-muted-foreground">
              댓글을 작성하려면 로그인 해 주세요.
            </p>
          )}
        </section>
      )}
    </main>
  );
}
