// app/api/board/comment/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;

  if (!currentUserId) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const postId = body?.postId as number | undefined;
  const content = body?.content as string | undefined;

  if (!postId || !content) {
    return NextResponse.json(
      { ok: false, message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      category: true,
    },
  });

  if (!post) {
    return NextResponse.json(
      { ok: false, message: "존재하지 않는 게시글입니다." },
      { status: 404 }
    );
  }

  // 공지사항에는 댓글 금지 (백엔드에서도 한 번 더 막기)
  if (post.category.slug === "notice") {
    return NextResponse.json(
      { ok: false, message: "공지사항에는 댓글을 달 수 없습니다." },
      { status: 403 }
    );
  }

  const created = await prisma.comment.create({
    data: {
      content: content.trim(),
      postId: post.id,
      authorId: currentUserId,
    },
    include: {
      author: true,
    },
  });

  const comment = {
    id: created.id,
    content: created.content,
    createdAt: created.createdAt.toISOString(),
    authorId: created.authorId,
    author: created.author
      ? { id: created.author.id, name: created.author.name }
      : null,
  };

  return NextResponse.json({ ok: true, comment }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";

  if (!currentUserId) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const commentId = body?.commentId as number | undefined;
  const content = body?.content as string | undefined;

  if (!commentId || !content) {
    return NextResponse.json(
      { ok: false, message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "존재하지 않는 댓글입니다." },
      { status: 404 }
    );
  }

  if (!isAdmin && existing.authorId !== currentUserId) {
    return NextResponse.json(
      { ok: false, message: "댓글 수정 권한이 없습니다." },
      { status: 403 }
    );
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: {
      content: content.trim(),
    },
    include: {
      author: true,
    },
  });

  const comment = {
    id: updated.id,
    content: updated.content,
    createdAt: updated.createdAt.toISOString(),
    authorId: updated.authorId,
    author: updated.author
      ? { id: updated.author.id, name: updated.author.name }
      : null,
  };

  return NextResponse.json({ ok: true, comment }, { status: 200 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";

  if (!currentUserId) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const commentId = body?.commentId as number | undefined;

  if (!commentId) {
    return NextResponse.json(
      { ok: false, message: "잘못된 요청입니다." },
      { status: 400 }
    );
  }

  const existing = await prisma.comment.findUnique({
    where: { id: commentId },
  });

  if (!existing) {
    return NextResponse.json(
      { ok: false, message: "존재하지 않는 댓글입니다." },
      { status: 404 }
    );
  }

  if (!isAdmin && existing.authorId !== currentUserId) {
    return NextResponse.json(
      { ok: false, message: "댓글 삭제 권한이 없습니다." },
      { status: 403 }
    );
  }

  await prisma.comment.delete({
    where: { id: commentId },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
