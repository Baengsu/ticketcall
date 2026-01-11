// 25.3.1 app/api/board/post/vote/route.ts
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { z } from "zod";
import { safeJson, flattenZodError } from "@/lib/validate";
import { ok, fail } from "@/lib/api-response";
import { zId, zVoteValue, parseSearchParams } from "@/lib/zod-shared";

const BodySchema = z.object({
  postId: zId,
  value: zVoteValue,
});

const QuerySchema = z.object({
  postId: zId,
});

export async function GET(req: Request) {
  const q = parseSearchParams(req);
  const parsed = QuerySchema.safeParse(q);
  if (!parsed.success) return fail("Invalid query", 400);

  const postId = parsed.data.postId;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { upCount: true, downCount: true, voteScore: true },
  });

  if (!post) return fail("Post not found", 404);

  const session = await getServerSession(authOptions);
  const rawUserId = (session as any)?.user?.id;
  const userId = rawUserId as string | undefined;

  let myVote = 0;
  if (userId) {
    const v = await prisma.postVote.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { value: true },
    });
    myVote = v?.value ?? 0;
  }

  return ok({
    up: post.upCount,
    down: post.downCount,
    score: post.voteScore,
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

  const { postId, value } = parsed.data;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true },
  });

  if (!post) return fail("Post not found", 404);
  if (post.authorId === userId) return fail("Cannot vote own post", 403);

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.postVote.findUnique({
      where: { postId_userId: { postId, userId } },
      select: { value: true },
    });

    let upDelta = 0;
    let downDelta = 0;
    let scoreDelta = 0;
    let myVote = value;

    if (!existing) {
      await tx.postVote.create({ data: { postId, userId, value } });
      if (value === 1) { upDelta = 1; scoreDelta = 1; }
      else { downDelta = 1; scoreDelta = -1; }
    } else if (existing.value === value) {
      await tx.postVote.delete({ where: { postId_userId: { postId, userId } } });
      myVote = 0;
      if (value === 1) { upDelta = -1; scoreDelta = -1; }
      else { downDelta = -1; scoreDelta = 1; }
    } else {
      await tx.postVote.update({
        where: { postId_userId: { postId, userId } },
        data: { value },
      });

      if (existing.value === 1 && value === -1) { upDelta = -1; downDelta = 1; scoreDelta = -2; }
      else if (existing.value === -1 && value === 1) { downDelta = -1; upDelta = 1; scoreDelta = 2; }
    }

    const postRow = await tx.post.update({
      where: { id: postId },
      data: {
        upCount: { increment: upDelta },
        downCount: { increment: downDelta },
        voteScore: { increment: scoreDelta },
      },
      select: { upCount: true, downCount: true, voteScore: true },
    });

    return { ...postRow, myVote };
  });

  return ok({
    up: result.upCount,
    down: result.downCount,
    score: result.voteScore,
    myVote: result.myVote,
  });
}
