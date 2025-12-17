// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, nickname, password } = await req.json();

    if (!username || !nickname || !password) {
      return NextResponse.json(
        { message: "아이디, 닉네임, 비밀번호는 필수입니다." },
        { status: 400 }
      );
    }

    // 유효성 검사
    if (username.length < 3) {
      return NextResponse.json(
        { message: "아이디는 최소 3자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { message: "아이디는 영문, 숫자, _ 만 사용 가능합니다." },
        { status: 400 }
      );
    }

    if (nickname.length < 2) {
      return NextResponse.json(
        { message: "닉네임은 최소 2자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "비밀번호는 최소 6자 이상이어야 합니다." },
        { status: 400 }
      );
    }

    // 아이디 중복 체크
    try {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUsername) {
        return NextResponse.json(
          { message: "이미 사용 중인 아이디입니다." },
          { status: 409 }
        );
      }
    } catch (err: any) {
      // username 필드가 없는 경우
      if (err.code === "P2001" || err.message?.includes("Unknown arg `username`")) {
        console.error("Username field not found. Migration may not be applied.");
        return NextResponse.json(
          { message: "데이터베이스 설정 오류가 발생했습니다. 관리자에게 문의하세요." },
          { status: 500 }
        );
      }
      throw err;
    }

    // 닉네임 중복 체크
    try {
      const existingNickname = await prisma.user.findUnique({
        where: { nickname },
      });

      if (existingNickname) {
        return NextResponse.json(
          { message: "이미 사용 중인 닉네임입니다." },
          { status: 409 }
        );
      }
    } catch (err: any) {
      // nickname 필드가 없는 경우
      if (err.code === "P2001" || err.message?.includes("Unknown arg `nickname`")) {
        console.error("Nickname field not found. Migration may not be applied.");
        return NextResponse.json(
          { message: "데이터베이스 설정 오류가 발생했습니다. 관리자에게 문의하세요." },
          { status: 500 }
        );
      }
      throw err;
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 회원 생성
    await prisma.user.create({
      data: {
        username,
        nickname,
        name: nickname, // 기존 호환성을 위해 name에도 저장
        passwordHash: hashedPassword,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error("Register error:", err);
    
    // Prisma unique constraint 오류 처리
    if (err.code === "P2002") {
      if (err.meta?.target?.includes("username")) {
        return NextResponse.json(
          { message: "이미 사용 중인 아이디입니다." },
          { status: 409 }
        );
      }
      if (err.meta?.target?.includes("nickname")) {
        return NextResponse.json(
          { message: "이미 사용 중인 닉네임입니다." },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { message: "서버 에러가 발생했습니다." },
      { status: 500 }
    );
  }
}
