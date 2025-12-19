// app/api/board/[slug]/posts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sanitizeForStorage } from "@/lib/html-sanitize";

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
    const rawContent = body?.content?.trim?.() as string | undefined;

    if (!title || !rawContent) {
      return NextResponse.json(
        { ok: false, message: "제목과 내용을 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    // Sanitize HTML content before saving to database
    // This prevents XSS attacks and ensures only safe HTML is stored
    const content = sanitizeForStorage(rawContent);

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

    // Only admin can write notices
    if (isNotice && !isAdmin) {
      return NextResponse.json(
        { ok: false, message: "공지사항은 관리자만 작성할 수 있습니다." },
        { status: 403 }
      );
    }

    // Any logged-in user can write to suggest/free boards
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

export async function PUT(req: Request, context: RouteContext) {
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
    const postId = body?.postId as number | undefined;
    const title = body?.title?.trim?.() as string | undefined;
    const rawContent = body?.content?.trim?.() as string | undefined;

    // Sanitize HTML content before saving to database
    const content = rawContent ? sanitizeForStorage(rawContent) : undefined;

    if (!postId || !Number.isFinite(postId)) {
      return NextResponse.json(
        { ok: false, message: "게시글 ID가 필요합니다." },
        { status: 400 }
      );
    }

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

    // 기존 게시글 확인
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
      include: { category: true },
    });

    if (!existingPost) {
      return NextResponse.json(
        { ok: false, message: "게시글을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (existingPost.categoryId !== category.id) {
      return NextResponse.json(
        { ok: false, message: "게시판이 일치하지 않습니다." },
        { status: 400 }
      );
    }

    const isNotice = slug === NOTICE_SLUG;

    // 권한 체크: 공지사항이면 admin만, 그 외에는 작성자 or admin
    if (isNotice) {
      if (!isAdmin) {
        return NextResponse.json(
          { ok: false, message: "공지사항은 관리자만 수정할 수 있습니다." },
          { status: 403 }
        );
      }
    } else {
      if (!isAdmin && existingPost.authorId !== userId) {
        return NextResponse.json(
          { ok: false, message: "본인의 글만 수정할 수 있습니다." },
          { status: 403 }
        );
      }
    }

    // 게시글 수정
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
      },
    });

    return NextResponse.json(
      { ok: true, postId: updatedPost.id },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}