// app/board/[slug]/page.tsx
import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";

const NOTICE_SLUG = "notice";   // 공지사항
const SUGGEST_SLUG = "suggest"; // 건의사항 (예전 free)

type PageProps = {
  // ✅ Next 16: params 가 Promise 로 들어온다
  params: Promise<{
    slug: string;
  }>;
};

export default async function BoardPage({ params }: PageProps) {
  // ✅ Promise 풀어서 slug 꺼내기
  const { slug } = await params;

  // slug 없으면 바로 404
  if (!slug) {
    notFound();
  }

  // 1. 슬러그로 카테고리 찾기
  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  // 2. 해당 카테고리의 글 목록 조회
  const posts = await prisma.post.findMany({
    where: { categoryId: category.id },
    orderBy: { createdAt: "desc" },
    include: {
      author: true,
    },
  });

  const isNotice = slug === NOTICE_SLUG;
  const isSuggest = slug === SUGGEST_SLUG;

  return (
    <main className="container mx-auto py-10 space-y-6">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {category.name}
          </h1>
          {isNotice && (
            <p className="text-sm text-muted-foreground">
              공지사항 게시판입니다. 관리자만 글을 작성할 수 있고, 댓글은 닫혀 있습니다.
            </p>
          )}
          {isSuggest && (
            <p className="text-sm text-muted-foreground">
              건의사항 게시판입니다. 회원은 자유롭게 건의글을 작성할 수 있고, 
              제목은 모두에게 공개되지만 내용은 작성자와 관리자만 볼 수 있습니다.
            </p>
          )}
        </div>

        {/* 글쓰기 버튼: slug 에 따라 권한 체크는 서버에서 한 번 더 함 */}
        <Link
          href={`/board/${slug}/new`}
          className="text-sm px-3 py-1 rounded-md bg-primary text-primary-foreground"
        >
          글쓰기
        </Link>
      </header>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 글이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((post) => (
            <li
              key={post.id}
              className="border rounded-md px-4 py-3 flex flex-col gap-1"
            >
              <div className="flex justify-between items-center">
                <Link
                  href={`/board/${slug}/${post.id}`}
                  className="font-medium hover:underline"
                >
                  {post.title}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {post.createdAt.toISOString().slice(0, 10)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span>{post.author?.name ?? "익명"}</span>
                <span>글번호 #{post.id}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
