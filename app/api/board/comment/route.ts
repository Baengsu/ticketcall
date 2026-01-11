// app/api/board/comment/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addPoints, POINT_RULES } from "@/lib/points";
import { getLevel } from "@/lib/level";
import { canHideContent } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId || !Number.isFinite(Number(postId))) {
      return NextResponse.json(
        { ok: false, message: "게시물 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined || "";
    const currentUser = session?.user as any | undefined;
    const currentUserId = currentUser?.id as string | undefined;
    const currentUserRole = currentUser?.role as string | undefined;
    const isAdmin = currentUserRole === "admin";

    // 레벨 기반 권한 확인 (댓글 필터링을 위해)
    let canHide: boolean = false;
    if (currentUserId && !isAdmin) {
      const userData = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { points: true },
      });
      if (userData && (userData as any).points !== undefined) {
        const userLevel = getLevel((userData as any).points);
        canHide = canHideContent(userLevel);
      }
    } else if (isAdmin) {
      canHide = true;
    }

    const comments = await prisma.comment.findMany({
      where: {
        postId: Number(postId),
        ...(isAdmin || canHide ? {} : { isHidden: false }),
      },
      orderBy: { createdAt: "asc" },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            points: true,
            equippedIcon: {
              select: {
                iconKey: true,
                source: true,
              },
            },
          },
        },
        votes: {
          select: { value: true },
        },
      },
    });

    // 각 댓글에 투표 수 계산 및 추가
    let commentsWithVotes: any[] = comments.map((comment) => {
      const voteUp = comment.votes.filter((v) => v.value === 1).length;
      const voteDown = comment.votes.filter((v) => v.value === -1).length;
      return {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt.toISOString(),
        authorId: comment.authorId,
        author: comment.author
          ? {
              id: comment.author.id,
              name: comment.author.name,
              email: comment.author.email,
              points: comment.author.points,
              equippedIcon: comment.author.equippedIcon,
            }
          : null,
        voteUp,
        voteDown,
      };
    });

    // 사용자의 투표 상태 조회 및 추가
    if (userId && commentsWithVotes.length) {
      const commentIds = commentsWithVotes.map((c: any) => c.id);

      const myVotes = await prisma.commentVote.findMany({
        where: { userId, commentId: { in: commentIds } },
        select: { commentId: true, value: true },
      });

      const map = new Map(myVotes.map((v) => [v.commentId, v.value]));

      commentsWithVotes = commentsWithVotes.map((c: any) => ({
        ...c,
        myVote: map.get(c.id) ?? 0,
      }));
    } else {
      commentsWithVotes = commentsWithVotes.map((c: any) => ({ ...c, myVote: 0 }));
    }

    return NextResponse.json({ ok: true, comments: commentsWithVotes });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

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
    select: {
      id: true,
      content: true,
      createdAt: true,
      authorId: true,
      upCount: true,
      downCount: true,
      voteScore: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          points: true,
          equippedIcon: {
            select: {
              iconKey: true,
              source: true,
            },
          },
        },
      },
    },
  });

  const comment = {
    id: created.id,
    content: created.content,
    createdAt: created.createdAt.toISOString(),
    authorId: created.authorId,
    author: created.author
      ? {
          id: created.author.id,
          name: created.author.name,
          points: (created.author as any).points ?? 0,
          equippedIcon: created.author.equippedIcon
            ? {
                iconKey: created.author.equippedIcon.iconKey,
                source: created.author.equippedIcon.source,
              }
            : null,
        }
      : null,
    voteUp: created.upCount ?? 0,
    voteDown: created.downCount ?? 0,
    voteScore: created.voteScore ?? 0,
    myVote: 0,
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
    select: {
      id: true,
      content: true,
      createdAt: true,
      authorId: true,
      upCount: true,
      downCount: true,
      voteScore: true,
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          points: true,
          equippedIcon: {
            select: {
              iconKey: true,
              source: true,
            },
          },
        },
      },
    },
  });

  const comment = {
    id: updated.id,
    content: updated.content,
    createdAt: updated.createdAt.toISOString(),
    authorId: updated.authorId,
    author: updated.author
      ? {
          id: updated.author.id,
          name: updated.author.name,
          points: (updated.author as any).points ?? 0,
          equippedIcon: updated.author.equippedIcon
            ? {
                iconKey: updated.author.equippedIcon.iconKey,
                source: updated.author.equippedIcon.source,
              }
            : null,
        }
      : null,
    voteUp: updated.upCount ?? 0,
    voteDown: updated.downCount ?? 0,
    voteScore: updated.voteScore ?? 0,
    myVote: 0,
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

  // 소프트 삭제 (숨김 처리)
  const now = new Date();
  await prisma.comment.update({
    where: { id: commentId },
    data: {
      isHidden: true,
      hiddenAt: now,
      hiddenReason: "작성자에 의한 삭제",
    },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
