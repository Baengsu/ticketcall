// app/board/[slug]/new/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import NewPostForm from "@/components/board/new-post-form";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function NewPostPage({ params }: PageProps) {
  const { slug } = await params;

  if (!slug) {
    notFound();
  }

  // 해당 슬러그의 카테고리 확인
  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    return (
      <main className="container mx-auto py-10">
        <h1 className="text-xl font-bold">존재하지 않는 게시판입니다.</h1>
        <p className="text-sm text-muted-foreground mt-2">
          잘못된 게시판 주소입니다:{" "}
          <code className="px-1 bg-muted rounded">{slug}</code>
        </p>
      </main>
    );
  }

  return (
    <main className="container mx-auto py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {category.name} - 글쓰기
        </h1>
        <p className="text-sm text-muted-foreground">
          새 글을 작성하고 등록할 수 있습니다.
        </p>
      </header>

      {/* 실제 폼 (클라이언트 컴포넌트) */}
      <NewPostForm slug={slug} />
    </main>
  );
}
