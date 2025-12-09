// app/board/[slug]/[postID]/edit/page.tsx
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import NewPostForm from "@/components/board/new-post-form";

const NOTICE_SLUG = "notice";

interface PageProps {
  params: Promise<{
    slug: string;
    postID: string;
  }>;
}

export default async function EditPostPage({ params }: PageProps) {
  const { slug, postID } = await params;

  if (!slug || !postID) notFound();

  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";

  if (!currentUserId) {
    notFound(); // 또는 redirect("/auth/login")으로 바꿔도 됨
  }

  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });
  if (!category) notFound();

  const postIdNum = Number(postID);
  if (!Number.isFinite(postIdNum)) notFound();

  const post = await prisma.post.findUnique({
    where: { id: postIdNum },
  });
  if (!post || post.categoryId !== category.id) {
    notFound();
  }

  // 권한 체크: 공지사항이면 admin만, 그 외에는 작성자 or admin
  if (slug === NOTICE_SLUG) {
    if (!isAdmin) notFound();
  } else {
    if (!isAdmin && post.authorId !== currentUserId) {
      notFound();
    }
  }

  return (
    <main className="container mx-auto py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          {category.name} - 글 수정
        </h1>
        <p className="text-sm text-muted-foreground">
          기존 글을 수정할 수 있습니다.
        </p>
      </header>

      <NewPostForm
        slug={slug}
        mode="edit"
        postId={post.id}
        initialTitle={post.title}
        initialContent={post.content}
      />
    </main>
  );
}
