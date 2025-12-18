// app/board/[slug]/[postID]/comment/[commentID]/edit/page.tsx
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

interface PageProps {
  params: Promise<{
    slug: string;
    postID: string;
    commentID: string;
  }>;
}

export default async function EditCommentPage({ params }: PageProps) {
  const { slug, postID, commentID } = await params;

  if (!slug || !postID || !commentID) {
    notFound();
  }

  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";

  if (!currentUserId) {
    redirect(`/auth/login?callbackUrl=/board/${slug}/${postID}`);
  }

  const commentIdNum = Number(commentID);
  if (!Number.isFinite(commentIdNum)) {
    notFound();
  }

  const comment = await prisma.comment.findUnique({
    where: { id: commentIdNum },
    include: {
      post: true,
    },
  });

  if (!comment) {
    notFound();
  }

  // 권한 체크: 작성자 또는 admin만 수정 가능
  if (!isAdmin && comment.authorId !== currentUserId) {
    notFound();
  }

  // 댓글 수정은 인라인으로 처리되므로 게시글 상세 페이지로 리다이렉트
  redirect(`/board/${slug}/${postID}`);
}
