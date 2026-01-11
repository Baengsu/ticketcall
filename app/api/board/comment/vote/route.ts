// 25.3.2 app/api/board/comment/vote/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { safeJson, flattenZodError } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";
import { zId, zVoteValue, parseSearchParams } from "@/lib/zod-shared";

const BodySchema = z.object({
  commentId: zId,
  value: zVoteValue,
});

const QuerySchema = z.object({
  commentId: zId,
});

export async function GET(req: Request) {
  const q = parseSearchParams(req);
  const parsed = QuerySchema.safeParse(q);
  if (!parsed.success) return fail("Invalid query", 400);

  const commentId = parsed.data.commentId;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { upCount: true, downCount: true, voteScore: true },
  });

  if (!comment) return fail("Comment not found", 404);

  const session = await getServerSession(authOptions);
  const rawUserId = (session as any)?.user?.id;
  const userId = rawUserId as string | undefined;

  let myVote = 0;
  if (userId) {
    const v = await prisma.commentVote.findUnique({
      where: { commentId_userId: { commentId, userId } },
      select: { value: true },
    });
    myVote = v?.value ?? 0;
  }

  return ok({
    up: comment.upCount,
    down: comment.downCount,
    score: comment.voteScore,
    myVote,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const rawUserId = (session as any)?.user?.id;
  const userId = rawUserId as string | undefined;

  if (!userId) return fail("Unauthorized", 401);

  const body = await safeJson(req);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return fail("Invalid payload", 400, { issues: flattenZodError(parsed.error) });
  }

  const { commentId, value } = parsed.data;

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) return fail("Comment not found", 404);
  if (comment.authorId === userId) return fail("Cannot vote own comment", 403);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.commentVote.findUnique({
      where: { commentId_userId: { commentId, userId } },
      select: { value: true },
    });

    let upDelta = 0;
    let downDelta = 0;
    let scoreDelta = 0;
    let myVote = value;

    if (!existing) {
      await tx.commentVote.create({ data: { commentId, userId, value } });
      if (value === 1) { upDelta = 1; scoreDelta = 1; }
      else { downDelta = 1; scoreDelta = -1; }
    } else if (existing.value === value) {
      await tx.commentVote.delete({ where: { commentId_userId: { commentId, userId } } });
      myVote = 0;
      if (value === 1) { upDelta = -1; scoreDelta = -1; }
      else { downDelta = -1; scoreDelta = 1; }
    } else {
      await tx.commentVote.update({
        where: { commentId_userId: { commentId, userId } },
        data: { value },
      });

      if (existing.value === 1 && value === -1) { upDelta = -1; downDelta = 1; scoreDelta = -2; }
      else if (existing.value === -1 && value === 1) { downDelta = -1; upDelta = 1; scoreDelta = 2; }
    }

    const commentRow = await tx.comment.update({
      where: { id: commentId },
      data: {
        upCount: { increment: upDelta },
        downCount: { increment: downDelta },
        voteScore: { increment: scoreDelta },
      },
      select: { upCount: true, downCount: true, voteScore: true },
    });

    return { ...commentRow, myVote };
  });

  return ok({
    up: result.upCount,
    down: result.downCount,
    score: result.voteScore,
    myVote: result.myVote,
  });
}
