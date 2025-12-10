// app/board/[slug]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

const NOTICE_SLUG = "notice";
// 🔥 건의사항 slug: /board/free 기준
const SUGGEST_SLUG = "free";

// 건의사항 제목 마스킹용
function maskTitle(title: string): string {
  if (!title) return "";
  const len = Math.min(title.length, 10);
  return "*".repeat(Math.max(3, len));
}

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

// ✅ Post + author + _count.comments 타입 명시
type PostWithMeta = Prisma.PostGetPayload<{
  include: {
    author: true;
    _count: {
      select: {
        comments: true;
      };
    };
  };
}>;

export default async function BoardPage({ params }: PageProps) {
  const { slug } = await params;

  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";

  const isNotice = slug === NOTICE_SLUG;
  const isSuggest = slug === SUGGEST_SLUG;

  // 🔥 글쓰기 권한:
  // - 공지: admin만
  // - 건의/나머지: 로그인 유저면 OK
  const canWrite = isNotice ? isAdmin : !!currentUserId;

  // 🔥 숨김 필터:
  // - 관리자: 숨긴 글까지 모두 조회
  // - 일반 유저: isHidden = false 인 글만 조회
  const whereCondition: Prisma.PostWhereInput = {
    categoryId: category.id,
    ...(isAdmin ? {} : { isHidden: false }),
  };

  const posts: PostWithMeta[] = await prisma.post.findMany({
    where: whereCondition,
    orderBy: isNotice
      ? [{ isPinned: "desc" }, { createdAt: "desc" }]
      : { createdAt: "desc" },
    include: {
      author: true,
      _count: {
        select: {
          comments: true,
        },
      },
    },
  });

  return (
    <main className="container mx-auto py-10 space-y-6">
      <header className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {category.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isNotice
              ? "사이트 공지사항을 모아둔 게시판입니다. 상단 고정된 공지가 먼저 표시됩니다."
              : isSuggest
              ? "건의사항은 작성자와 관리자만 상세 내용을 볼 수 있습니다. 제목은 다른 유저에게 마스킹됩니다."
              : "게시판 목록입니다."}
          </p>
        </div>

        {canWrite && (
          <a
            href={`/board/${slug}/new`}
            className="px-4 py-2 text-sm rounded-md bg-black text-white"
          >
            글쓰기
          </a>
        )}
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 글이 없습니다.</p>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">제목</th>
                <th className="px-3 py-2 text-left w-32">작성자</th>
                <th className="px-3 py-2 text-left w-32">작성일</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => {
                const isAuthor = currentUserId === post.authorId;

                const rawTitle = post.title;
                const commentCount = post._count.comments;

                const DONE_PREFIX = "[완료] ";
                let displayTitle = rawTitle;

                // 🔥 건의사항 제목 마스킹 로직
                if (isSuggest && !isAdmin && !isAuthor) {
                  if (rawTitle.startsWith(DONE_PREFIX)) {
                    displayTitle =
                      DONE_PREFIX +
                      maskTitle(rawTitle.slice(DONE_PREFIX.length));
                  } else {
                    displayTitle = maskTitle(rawTitle);
                  }
                }

                // 🔥 공지 게시판에서 상단 고정된 글이면 [공지] 표시
                if (isNotice && (post as any).isPinned) {
                  displayTitle = `[공지] ${displayTitle}`;
                }

                // 🔥 관리자에게는 숨김 글에 [숨김] 표시
                if (isAdmin && (post as any).isHidden) {
                  displayTitle = `[숨김] ${displayTitle}`;
                }

                const titleWithCount =
                  commentCount > 0
                    ? `${displayTitle} (${commentCount})`
                    : displayTitle;

                return (
                  <tr key={post.id} className="border-t">
                    <td className="px-3 py-2">
                      <a
                        href={`/board/${slug}/${post.id}`}
                        className="hover:underline"
                      >
                        {titleWithCount}
                      </a>
                    </td>
                    <td className="px-3 py-2">
                      {post.author?.name ?? "익명"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {post.createdAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
