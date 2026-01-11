// scripts/seed-phoenix-icons.ts
import prisma from "../lib/prisma";

/**
 * Phoenix 아이콘 8단계를 데이터베이스에 생성하는 스크립트
 * 
 * 실행: npx tsx scripts/seed-phoenix-icons.ts
 */

const PHOENIX_ICONS = [
  { stage: 1, name: "Phoenix Stage 1", price: 100, rarity: "common" },
  { stage: 2, name: "Phoenix Stage 2", price: 250, rarity: "common" },
  { stage: 3, name: "Phoenix Stage 3", price: 500, rarity: "rare" },
  { stage: 4, name: "Phoenix Stage 4", price: 1000, rarity: "rare" },
  { stage: 5, name: "Phoenix Stage 5", price: 2000, rarity: "epic" },
  { stage: 6, name: "Phoenix Stage 6", price: 4000, rarity: "epic" },
  { stage: 7, name: "Phoenix Stage 7", price: 8000, rarity: "legendary" },
  { stage: 8, name: "Phoenix Stage 8", price: 15000, rarity: "legendary" },
];

async function main() {
  console.log("Phoenix 아이콘 생성 중...");

  for (const icon of PHOENIX_ICONS) {
    const iconKey = `phoenix_stage_${icon.stage}`;
    
    // 이미 존재하는지 확인
    const existing = await prisma.iconItem.findUnique({
      where: { iconKey },
    });

    if (existing) {
      console.log(`✓ ${iconKey} 이미 존재함 (건너뜀)`);
      continue;
    }

    // 아이콘 생성
    await prisma.iconItem.create({
      data: {
        name: icon.name,
        iconKey,
        source: "custom",
        price: icon.price,
        rarity: icon.rarity,
        isLimited: false,
      },
    });

    console.log(`✓ ${iconKey} 생성 완료 (${icon.name}, ${icon.price} 포인트)`);
  }

  console.log("\n모든 Phoenix 아이콘 생성 완료!");
}

main()
  .catch((e) => {
    console.error("오류 발생:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

