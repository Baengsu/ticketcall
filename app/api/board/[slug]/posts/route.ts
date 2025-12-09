// app/api/board/[slug]/posts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const NOTICE_SLUG = "notice";
// 건의사항 slug (목록/상세와 동일하게!)
const SUGGEST_SLUG = "free";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function POST(req: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const session = await getServerSession(authOptions);
    const currentUser = session?.user as any | undefined;
    const userId = currentUser?.id as string | undefined;
    const role = currentUser?.role as string | undefined;
    const isAdmin = role === "admin";

    if (!userId) {
      return NextResponse.json(
        { ok: false, message: "로그인이 필요합니다." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => null);
    const title = body?.title?.trim?.() as string | undefined;
    const content = body?.content?.trim?.() as string | undefined;

    if (!title || !content) {
      return NextResponse.json(
        { ok: false, message: "제목과 내용을 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    const category = await prisma.boardCategory.findUnique({
      where: { slug },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, message: "존재하지 않는 게시판입니다." },
        { status: 404 }
      );
    }

    const isNotice = slug === NOTICE_SLUG;
    const isSuggest = slug === SUGGEST_SLUG;

    // 🔥 공지사항은 admin만 작성 가능
    if (isNotice && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "공지사항은 관리자만 작성할 수 있습니다." },
        { status: 403 }
      );
    }

    // 🔥 건의사항(suggest) / 기타 게시판은 로그인 유저면 누구나 작성 가능
    const post = await prisma.post.create({
      data: {
        title,
        content,
        categoryId: category.id,
        authorId: userId,
      },
    });

    return NextResponse.json(
      { ok: true, postId: post.id },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
