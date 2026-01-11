// app/api/admin/boards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

/**
 * 게시판 목록 조회 및 생성
 * GET: 모든 게시판 조회
 * POST: 새 게시판 생성
 */
export async function GET() {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: gate.status }
    );
  }

  try {
    const boards = await prisma.boardCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        minPostLevel: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        boards: boards.map((board) => ({
          id: board.id,
          slug: board.slug,
          name: board.name,
          minPostLevel: board.minPostLevel,
          postCount: board._count.posts,
          createdAt: board.createdAt.toISOString(),
          updatedAt: board.updatedAt.toISOString(),
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Boards GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: "게시판 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 새 게시판 생성
 * Body: { slug: string, name: string, minPostLevel?: number }
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: gate.status }
    );
  }

  try {
    const body = await req.json().catch(() => null);
    const slug = body?.slug?.trim() as string | undefined;
    const name = body?.name?.trim() as string | undefined;
    const minPostLevel = body?.minPostLevel as number | undefined;

    // 입력 검증
    if (!slug || !name) {
      return NextResponse.json(
        { ok: false, message: "slug와 name은 필수입니다." },
        { status: 400 }
      );
    }

    // slug 유효성 검사 (영문자, 숫자, 하이픈만 허용)
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { ok: false, message: "slug는 영문자, 숫자, 하이픈만 사용할 수 있습니다." },
        { status: 400 }
      );
    }

    // minPostLevel 검증 (1-5 사이)
    const level = minPostLevel !== undefined ? Number(minPostLevel) : 1;
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      return NextResponse.json(
        { ok: false, message: "minPostLevel은 1-5 사이의 정수여야 합니다." },
        { status: 400 }
      );
    }

    // 게시판 생성
    const board = await prisma.boardCategory.create({
      data: {
        slug,
        name,
        minPostLevel: level,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        minPostLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        board: {
          ...board,
          createdAt: board.createdAt.toISOString(),
          updatedAt: board.updatedAt.toISOString(),
        },
        message: "게시판이 생성되었습니다.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[Admin Boards POST] Error:", error);

    // 중복 slug 에러 처리
    if (error.code === "P2002") {
      return NextResponse.json(
        { ok: false, message: "이미 존재하는 slug입니다." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, message: "게시판 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

