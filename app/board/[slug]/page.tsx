// app/board/[slug]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";

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
  searchParams: Promise<{
    error?: string;
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

export default async function BoardPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { error } = await searchParams;

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
    <main className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="space-y-6">
        {/* 에러 메시지 */}
        {error === "access_denied" && (
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚠️ 건의사항은 작성자와 관리자만 볼 수 있습니다.
            </p>
          </div>
        )}

        {/* 헤더 */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl">
                {category.name === "공지사항" ? "📢" : "💬"}
              </span>
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                {category.name}
              </h1>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {isNotice
                  ? "사이트 공지사항을 모아둔 게시판입니다. 상단 고정된 공지가 먼저 표시됩니다."
                  : isSuggest
                  ? "건의사항은 작성자와 관리자만 상세 내용을 볼 수 있습니다. 제목은 다른 유저에게 마스킹됩니다."
                  : "게시판 목록입니다."}
              </p>
            </div>
          </div>

          {canWrite && (
            <a
              href={`/board/${slug}/new`}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
            >
              ✏️ 글쓰기
            </a>
          )}
        </header>

        {/* 게시글 목록 */}
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-lg font-medium text-muted-foreground mb-2">
              아직 글이 없습니다
            </p>
            <p className="text-sm text-muted-foreground">
              첫 번째 글을 작성해보세요!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => {
              const isAuthor = currentUserId === post.authorId;
              const rawTitle = post.title;
              const commentCount = post._count.comments;
              const DONE_PREFIX = "[완료] ";
              let displayTitle = rawTitle;
              const isPinned = (post as any).isPinned;
              const isHidden = (post as any).isHidden;

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
              if (isNotice && isPinned) {
                displayTitle = `[공지] ${displayTitle}`;
              }

              // 🔥 관리자에게는 숨김 글에 [숨김] 표시
              if (isAdmin && isHidden) {
                displayTitle = `[숨김] ${displayTitle}`;
              }

              return (
                <a
                  key={post.id}
                  href={`/board/${slug}/${post.id}`}
                  className="block p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {isPinned && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                            공지
                          </span>
                        )}
                        {isHidden && isAdmin && (
                          <span className="px-2 py-0.5 text-xs font-semibold rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            숨김
                          </span>
                        )}
                        <h3 className="text-base font-semibold group-hover:text-primary transition-colors line-clamp-2">
                          {displayTitle}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium">
                          {post.author?.name ?? "익명"}
                        </span>
                        <span>·</span>
                        <time>
                          {new Date(post.createdAt).toLocaleDateString("ko-KR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </time>
                        <span>·</span>
                        <span className="flex items-center gap-1">
                          👁️ {(post as any).viewCount ?? 0}
                        </span>
                        {commentCount > 0 && (
                          <>
                            <span>·</span>
                            <span className="text-primary font-medium">
                              💬 {commentCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-muted-foreground group-hover:text-primary transition-colors">
                      →
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
