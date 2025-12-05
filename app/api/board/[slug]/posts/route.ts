// app/api/board/[slug]/posts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

const NOTICE_SLUG = "notice";   // 공지사항
const SUGGEST_SLUG = "suggest"; // 건의사항

// [POST] /api/board/:slug/posts  → 글 작성
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> } // ⬅ params가 Promise!
) {
  // 🔹 여기서 반드시 await 해줘야 함
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { ok: false, message: "잘못된 게시판 주소입니다." },
      { status: 400 }
    );
  }

  // 1. 로그인 체크
  const session = await getServerSession(authOptions);
// next-auth 타입에는 id가 없다고 되어 있어서 any로 캐스팅
  const userId = (session?.user as any)?.id as string | undefined;

  if (!userId) {
    return NextResponse.json(
      { ok: false, message: "로그인이 필요합니다." },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "존재하지 않는 사용자입니다." },
      { status: 401 }
    );
  }

  // 2. 권한 체크
  if (slug === NOTICE_SLUG && user.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "공지사항은 관리자만 작성할 수 있습니다." },
      { status: 403 }
    );
  }
  // 건의사항은 user/admin 둘 다 가능 → 특별히 막지 않음

  // 3. body 파싱
  const body = await req.json();
  const title = String(body.title ?? "").trim();
  const content = String(body.content ?? "").trim();

  if (!title || !content) {
    return NextResponse.json(
      { ok: false, message: "제목과 내용을 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  // 4. 슬러그로 카테고리 찾기
  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    return NextResponse.json(
      { ok: false, message: `존재하지 않는 게시판입니다: ${slug}` },
      { status: 404 }
    );
  }

  // 5. 글 생성
  const post = await prisma.post.create({
    data: {
      title,
      content,
      categoryId: category.id,
      authorId: user.id,
    },
  });

  return NextResponse.json(
    { ok: true, postId: post.id },
    { status: 201 }
  );
}

// [GET] /api/board/:slug/posts  → 해당 게시판 글 목록 (필요하면 사용)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { ok: false, message: "잘못된 게시판 주소입니다." },
      { status: 400 }
    );
  }

  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    return NextResponse.json(
      { ok: false, message: `존재하지 않는 게시판입니다: ${slug}` },
      { status: 404 }
    );
  }

  const posts = await prisma.post.findMany({
    where: { categoryId: category.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, posts });
}
