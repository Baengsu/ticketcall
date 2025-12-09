// app/mypage/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const session = await getServerSession(authOptions);

  // 로그인 안 되어 있으면 → 로그인 페이지로
  if (!session || !session.user) {
    redirect("/auth/login?callbackUrl=/mypage");
  }

  const currentUser = session.user as any;
  const userId = currentUser.id as string;
  const userName =
    currentUser.name ?? currentUser.email ?? "사용자";

  // 내가 쓴 글 + 내가 쓴 댓글 동시에 가져오기
  const [posts, comments] = await Promise.all([
    prisma.post.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        _count: {
          select: { comments: true }, // 댓글 개수
        },
      },
    }),
    prisma.comment.findMany({
      where: { authorId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        post: {
          include: {
            category: true,
          },
        },
      },
    }),
  ]);

  return (
    <main className="container mx-auto py-10 space-y-8">
      {/* 상단 인사 영역 */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          마이페이지
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold">{userName}</span> 님의
          활동 내역입니다.
        </p>
      </section>

      {/* 내가 쓴 글 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">내가 쓴 글</h2>
          <span className="text-xs text-muted-foreground">
            총 {posts.length}개
          </span>
        </div>

        {posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 작성한 글이 없습니다.
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-28">게시판</th>
                  <th className="px-3 py-2 text-left">제목</th>
                  <th className="px-3 py-2 text-left w-24">댓글</th>
                  <th className="px-3 py-2 text-left w-32">작성일</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr key={post.id} className="border-t">
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {post.category?.name ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      <a
                        href={`/board/${post.category?.slug ?? ""}/${post.id}`}
                        className="hover:underline"
                      >
                        {post.title}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {(post as any)._count?.comments ?? 0}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {post.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 내가 쓴 댓글 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">내가 쓴 댓글</h2>
          <span className="text-xs text-muted-foreground">
            총 {comments.length}개
          </span>
        </div>

        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            아직 작성한 댓글이 없습니다.
          </p>
        ) : (
          <ul className="space-y-3">
            {comments.map((comment) => {
              const post = comment.post as any;
              const category = post?.category;

              return (
                <li
                  key={comment.id}
                  className="border rounded-md px-3 py-2 text-sm space-y-1"
                >
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {category?.name ?? "게시판"} /{" "}
                      <a
                        href={`/board/${category?.slug ?? ""}/${post?.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {post?.title ?? "글 보기"}
                      </a>
                    </span>
                    <span>
                      {comment.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">
                    {comment.content.length > 80
                      ? comment.content.slice(0, 80) + "..."
                      : comment.content}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
