// app/board/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import PostsList from "@/components/board/posts-list";
import { getLevel, getLevelProgress } from "@/lib/level";
import { canHideContent } from "@/lib/permissions";
import { getUsersBadgesBatch } from "@/lib/badges";
import { Button } from "@/components/ui/button";

const NOTICE_SLUG = "notice";
// 건의사항 slug: /board/free 기준
const SUGGEST_SLUG = "free";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    error?: string;
    sort?: string | string[];
  }>;
}

// ✅ Post + author (select) + _count.comments 타입 명시
type PostWithMeta = Prisma.PostGetPayload<{
  include: {
    author: {
      select: {
        id: true;
        name: true;
        email: true;
        points: true;
        equippedIcon: {
          select: {
            iconKey: true;
            source: true;
          };
        };
      };
    };
    _count: {
      select: {
        comments: true;
      };
    };
  };
}>;

export default async function BoardPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const searchParamsResolved = (await searchParams) ?? {};
  const { error } = searchParamsResolved;
  
  const sortRaw = searchParamsResolved?.sort;
  const sort = (Array.isArray(sortRaw) ? sortRaw[0] : sortRaw) || "new";

  const category = await prisma.boardCategory.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      minPostLevel: true,
    },
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

  // 사용자 포인트 및 레벨 조회 (레벨 체크용)
  let userLevel: number | null = null;
  let userPoints: number | null = null;
  let canViewHidden: boolean = isAdmin; // 관리자는 항상 숨김 콘텐츠 볼 수 있음
  if (currentUserId && !isAdmin) {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { points: true },
    });
    if (user) {
      userPoints = user.points;
      userLevel = getLevel(user.points);
      // Lv.5+ (모더레이터)도 숨김 콘텐츠를 볼 수 있음
      canViewHidden = userLevel >= 5;
    }
  }

  // 🔥 글쓰기 권한:
  // - 공지: admin만
  // - 건의/나머지: 로그인 유저면 OK + 레벨 체크
  let canWrite = false;
  if (isNotice) {
    canWrite = isAdmin;
  } else {
    if (currentUserId) {
      // 관리자는 레벨 제한 우회
      if (isAdmin) {
        canWrite = true;
      } else {
        // 일반 사용자는 레벨 체크 (minPostLevel이 1보다 큰 경우에만)
        if (category.minPostLevel > 1) {
          canWrite = userLevel !== null && userLevel >= category.minPostLevel;
        } else {
          canWrite = true; // minPostLevel이 1이면 모든 로그인 사용자 가능
        }
      }
    }
  }

  // 🔥 숨김 필터:
  // - 관리자 또는 Lv.5+ (모더레이터): 숨긴 글까지 모두 조회
  // - 일반 유저: isHidden = false 인 글만 조회
  const whereCondition: Prisma.PostWhereInput = {
    categoryId: category.id,
    ...(canViewHidden ? {} : { isHidden: false }),
  };

  const posts: PostWithMeta[] = await prisma.post.findMany({
    where: whereCondition,
    orderBy: isNotice
      ? [{ isPinned: "desc" }, { createdAt: "desc" }]
      : { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          points: true, // 레벨 기반 스타일링을 위해 포인트 포함
          equippedIcon: {
            select: {
              iconKey: true,
              source: true,
            },
          },
        },
      },
      _count: {
        select: {
          comments: true,
        },
      },
    },
    take: 50,
  });

  // 게시물 작성자들의 배지 계산
  const authorIds = posts.map((post) => post.author?.id).filter((id): id is string => !!id);
  const badgesMap = await getUsersBadgesBatch(authorIds, slug);

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
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                  {category.name}
                </h1>
                {/* 최소 필요 레벨 표시 */}
                {category.minPostLevel > 1 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                    최소 Lv.{category.minPostLevel}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {isNotice
                  ? "사이트 공지사항을 모아둔 게시판입니다. 상단 고정된 공지가 먼저 표시됩니다."
                  : isSuggest
                  ? "건의사항은 작성자와 관리자만 상세 내용을 볼 수 있습니다. 제목은 다른 유저에게 마스킹됩니다."
                  : "게시판 목록입니다."}
              </p>
            </div>
          </div>

          {/* 글쓰기 버튼 영역 */}
          <div className="flex flex-col items-end gap-2">
            {currentUserId && userLevel !== null && userPoints !== null && (() => {
              const progress = getLevelProgress(userPoints);
              return (
                <div className="flex flex-col items-end gap-1 text-xs">
                  <span className="text-muted-foreground">
                    현재 레벨: <span className="font-semibold text-foreground">Lv.{userLevel}</span>
                  </span>
                  {progress.nextLevelPoints !== null ? (
                    <div className="w-32 space-y-0.5">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>다음 레벨까지</span>
                        <span>{progress.progressPercent.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                          style={{ width: `${progress.progressPercent}%` }}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}
            {canWrite ? (
              <a
                href={`/board/${slug}/new`}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
              >
                ✏️ 글쓰기
              </a>
            ) : currentUserId ? (
              // 레벨이 부족한 경우 (로그인은 되어 있음)
              <div className="px-5 py-2.5 rounded-lg bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed opacity-60 whitespace-nowrap">
                ✏️ 글쓰기
                {category.minPostLevel > 1 && userLevel !== null && userLevel < category.minPostLevel && (
                  <span className="ml-2 text-xs">
                    (Lv.{category.minPostLevel} 필요)
                  </span>
                )}
              </div>
            ) : (
              // 로그인하지 않은 경우
              <a
                href="/auth/login"
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity shadow-sm whitespace-nowrap"
              >
                ✏️ 글쓰기
              </a>
            )}
          </div>
        </header>

        {/* 정렬 버튼 */}
        <div className="flex items-center gap-2 mb-4">
          <Link href={`/board/${slug}?sort=new`}>
            <Button variant={sort === "new" ? "default" : "outline"} size="sm">최신</Button>
          </Link>
          <Link href={`/board/${slug}?sort=best`}>
            <Button variant={sort === "best" ? "default" : "outline"} size="sm">베스트</Button>
          </Link>
          <Link href={`/board/${slug}?sort=hot`}>
            <Button variant={sort === "hot" ? "default" : "outline"} size="sm">핫</Button>
          </Link>
        </div>

        {/* 게시글 목록 */}
        <PostsList
          posts={posts}
          slug={slug}
          sort={sort}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isNotice={isNotice}
          isSuggest={isSuggest}
          badgesMap={badgesMap}
        />
      </div>
    </main>
  );
}
