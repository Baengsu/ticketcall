// 25.4.1 app/api/admin/vote-stats/route.ts
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ok, fail } from "@/lib/api-response";
import { z } from "zod";
import { parseSearchParams } from "@/lib/zod-shared";

const QuerySchema = z.object({
  range: z.string().optional().default("7d"),
  limit: z.coerce.number().int().min(5).max(50).optional().default(20),
});

function rangeToFrom(range: string) {
  const now = new Date();
  if (range === "24h") return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return null;
}

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return fail(gate.status === 401 ? "Unauthorized" : "Forbidden", gate.status);

  const q = parseSearchParams(req);
  const parsed = QuerySchema.safeParse(q);
  if (!parsed.success) return fail("Invalid query", 400);

  const { range, limit } = parsed.data;
  const from = rangeToFrom(range);

  const whereByRange = from ? { createdAt: { gte: from } } : {};

  const [topPosts, topComments, totals] = await Promise.all([
    prisma.post.findMany({
      where: whereByRange,
      orderBy: [{ voteScore: "desc" }, { upCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true, title: true, createdAt: true, upCount: true, downCount: true, voteScore: true },
    }),
    prisma.comment.findMany({
      where: whereByRange,
      orderBy: [{ voteScore: "desc" }, { upCount: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: { id: true, createdAt: true, upCount: true, downCount: true, voteScore: true },
    }),
    Promise.all([
      prisma.post.count({ where: whereByRange }),
      prisma.comment.count({ where: whereByRange }),
      prisma.postVote.count({ where: from ? { createdAt: { gte: from } } : {} }),
      prisma.commentVote.count({ where: from ? { createdAt: { gte: from } } : {} }),
    ]).then(([posts, comments, postVotes, commentVotes]) => ({
      posts,
      comments,
      postVotes,
      commentVotes,
      totalVotes: postVotes + commentVotes,
    })),
  ]);

  return ok({
    range,
    from: from?.toISOString() ?? null,
    limit,
    totals,
    topPosts,
    topComments,
  });
}
