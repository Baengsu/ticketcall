// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // 기본 게시판 카테고리 생성/업데이트
  console.log("📋 Creating board categories...");

  // 공지사항 게시판
  const notice = await prisma.boardCategory.upsert({
    where: { slug: "notice" },
    update: {
      name: "공지사항",
    },
    create: {
      slug: "notice",
      name: "공지사항",
    },
  });
  console.log(`✓ Created/Updated board: ${notice.slug} (${notice.name})`);

  // 건의사항 게시판
  const suggest = await prisma.boardCategory.upsert({
    where: { slug: "free" },
    update: {
      name: "건의사항",
    },
    create: {
      slug: "free",
      name: "건의사항",
    },
  });
  console.log(`✓ Created/Updated board: ${suggest.slug} (${suggest.name})`);

  console.log("✅ Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
