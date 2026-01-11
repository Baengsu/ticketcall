// scripts/set-admin.ts
// 로컬 개발용: 특정 유저를 관리자로 설정하는 스크립트
// 사용법: npx tsx scripts/set-admin.ts <email 또는 userId>

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function setAdmin(identifier: string) {
  try {
    // email 또는 id로 유저 찾기
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { id: identifier },
          { username: identifier },
        ],
      },
    });

    if (!user) {
      console.error(`❌ 유저를 찾을 수 없습니다: ${identifier}`);
      process.exit(1);
    }

    // 이미 관리자인지 확인
    if (user.role === "admin") {
      console.log(`ℹ️  ${user.email || user.id}는 이미 관리자입니다.`);
      await prisma.$disconnect();
      return;
    }

    // 관리자로 변경
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "admin" },
    });

    console.log(`✅ ${user.email || user.id}를 관리자로 설정했습니다.`);
    console.log(`   - ID: ${user.id}`);
    console.log(`   - Email: ${user.email || "없음"}`);
    console.log(`   - Username: ${user.username || "없음"}`);
  } catch (error) {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 명령줄 인자 확인
const identifier = process.argv[2];

if (!identifier) {
  console.error("사용법: npx tsx scripts/set-admin.ts <email|userId|username>");
  console.error("예시: npx tsx scripts/set-admin.ts user@example.com");
  process.exit(1);
}

setAdmin(identifier);






