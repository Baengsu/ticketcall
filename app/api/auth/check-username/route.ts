// app/api/auth/check-username/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get("username");

    if (!username || username.length < 3) {
      return NextResponse.json(
        { available: false, message: "아이디는 최소 3자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 영문, 숫자, _ 만 허용
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { available: false, message: "아이디는 영문, 숫자, _ 만 사용 가능합니다." },
        { status: 400 }
      );
    }

    try {
      const existing = await prisma.user.findUnique({
        where: { username },
      });

      return NextResponse.json({
        available: !existing,
        message: existing ? "이미 사용 중인 아이디입니다." : "사용 가능한 아이디입니다.",
      });
    } catch (err: any) {
      // username 필드가 없거나 unique 제약이 없는 경우
      if (err.code === "P2001" || err.message?.includes("Unknown arg `username`")) {
        console.error("Username field not found in database. Migration may not be applied.");
        return NextResponse.json({
          available: false,
          message: "데이터베이스 설정 오류가 발생했습니다. 관리자에게 문의하세요.",
        }, { status: 500 });
      }
      throw err;
    }
  } catch (err) {
    console.error("Check username error:", err);
    return NextResponse.json(
      { available: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

