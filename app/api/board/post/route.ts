// app/api/board/post/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  // 1. 세션 확인 (로그인 필수)
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.email) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  // 2. 요청 바디 파싱
  const { slug, title, content } = await req.json();

  if (
    !slug ||
    typeof slug !== "string" ||
    !title?.trim() ||
    !content?.trim()
  ) {
    return NextResponse.json(
      { ok: false, message: "slug, 제목, 내용을 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  // 3. 카테고리 찾기
  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    return NextResponse.json(
      { ok: false, message: "존재하지 않는 게시판입니다." },
      { status: 404 }
    );
  }

  // 4. 현재 로그인한 유저 찾기
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "유저 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  // 5. 글 생성
  const post = await prisma.post.create({
    data: {
      title: title.trim(),
      content: content.trim(),
      categoryId: category.id,
      authorId: user.id,
    },
  });

  return NextResponse.json(
    {
      ok: true,
      postId: post.id,
    },
    { status: 201 }
  );
}
