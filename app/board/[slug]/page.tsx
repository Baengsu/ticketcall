// app/board/[slug]/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import PostsList from "@/components/board/posts-list";

const NOTICE_SLUG = "notice";
// 건의사항 slug: /board/free 기준
const SUGGEST_SLUG = "free";

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
        <PostsList
          posts={posts}
          slug={slug}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isNotice={isNotice}
          isSuggest={isSuggest}
        />
      </div>
    </main>
  );
}
