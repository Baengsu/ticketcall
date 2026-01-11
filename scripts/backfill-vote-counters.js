const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("[backfill] reset counters...");
  await prisma.post.updateMany({ data: { upCount: 0, downCount: 0, voteScore: 0 } });
  await prisma.comment.updateMany({ data: { upCount: 0, downCount: 0, voteScore: 0 } });

  console.log("[backfill] aggregate post votes...");
  const postAgg = await prisma.postVote.groupBy({
    by: ["postId", "value"],
    _count: { _all: true },
  });

  const postMap = new Map();
  for (const row of postAgg) {
    const prev = postMap.get(row.postId) || { up: 0, down: 0 };
    if (row.value === 1) prev.up = row._count._all;
    if (row.value === -1) prev.down = row._count._all;
    postMap.set(row.postId, prev);
  }

  console.log(`[backfill] updating ${postMap.size} posts...`);
  const postIds = Array.from(postMap.keys());
  for (let i = 0; i < postIds.length; i += 200) {
    const chunk = postIds.slice(i, i + 200);
    await prisma.$transaction(
      chunk.map((id) => {
        const c = postMap.get(id);
        return prisma.post.update({
          where: { id },
          data: {
            upCount: c.up,
            downCount: c.down,
            voteScore: c.up - c.down,
          },
        });
      })
    );
    console.log(`[backfill] posts ${i + chunk.length}/${postIds.length}`);
  }

  console.log("[backfill] aggregate comment votes...");
  const commentAgg = await prisma.commentVote.groupBy({
    by: ["commentId", "value"],
    _count: { _all: true },
  });

  const commentMap = new Map();
  for (const row of commentAgg) {
    const prev = commentMap.get(row.commentId) || { up: 0, down: 0 };
    if (row.value === 1) prev.up = row._count._all;
    if (row.value === -1) prev.down = row._count._all;
    commentMap.set(row.commentId, prev);
  }

  console.log(`[backfill] updating ${commentMap.size} comments...`);
  const commentIds = Array.from(commentMap.keys());
  for (let i = 0; i < commentIds.length; i += 300) {
    const chunk = commentIds.slice(i, i + 300);
    await prisma.$transaction(
      chunk.map((id) => {
        const c = commentMap.get(id);
        return prisma.comment.update({
          where: { id },
          data: {
            upCount: c.up,
            downCount: c.down,
            voteScore: c.up - c.down,
          },
        });
      })
    );
    console.log(`[backfill] comments ${i + chunk.length}/${commentIds.length}`);
  }

  console.log("[backfill] done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

