// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

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
      minPostLevel: 1,
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
      minPostLevel: 1,
    },
  });
  console.log(`✓ Created/Updated board: ${suggest.slug} (${suggest.name})`);

  // Admin 사용자 생성 (선택적)
  console.log("👤 Checking admin user...");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminNickname = process.env.ADMIN_NICKNAME || "관리자";

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: adminEmail },
        { username: adminUsername },
        { role: "admin" },
      ],
    },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.create({
      data: {
        username: adminUsername,
        nickname: adminNickname,
        name: adminNickname,
        email: adminEmail,
        passwordHash: hashedPassword,
        role: "admin",
        points: 0,
      },
    });
    console.log(`✓ Created admin user: ${admin.username} (${admin.email})`);
    console.log(`  Default password: ${adminPassword}`);
    console.log(`  ⚠️  Please change the password after first login!`);
  } else {
    console.log(`✓ Admin user already exists: ${existingAdmin.email || existingAdmin.username}`);
  }

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
