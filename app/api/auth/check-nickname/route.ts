// app/api/auth/check-nickname/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nickname = searchParams.get("nickname");

    if (!nickname || nickname.length < 2) {
      return NextResponse.json(
        { available: false, message: "닉네임은 최소 2자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { nickname },
      });

      return NextResponse.json({
        available: !existing,
        message: existing ? "이미 사용 중인 닉네임입니다." : "사용 가능한 닉네임입니다.",
      });
    } catch (err: any) {
      // nickname 필드가 없거나 unique 제약이 없는 경우
      if (err.code === "P2001" || err.message?.includes("Unknown arg `nickname`")) {
        console.error("Nickname field not found in database. Migration may not be applied.");
        return NextResponse.json({
          available: false,
          message: "데이터베이스 설정 오류가 발생했습니다. 관리자에게 문의하세요.",
        }, { status: 500 });
      }
      throw err;
    }
  } catch (err) {
    console.error("Check nickname error:", err);
    return NextResponse.json(
      { available: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

