// app/api/admin/boards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

/**
 * 게시판 조회, 수정, 삭제
 * GET: 게시판 조회
 * PATCH: 게시판 수정 (minPostLevel 포함)
 * DELETE: 게시판 삭제
 */
export async function GET(req: NextRequest, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: gate.status }
    );
  }

  try {
    const { id } = await context.params;
    const boardId = Number(id);

    if (!Number.isFinite(boardId)) {
      return NextResponse.json(
        { ok: false, message: "유효하지 않은 게시판 ID입니다." },
        { status: 400 }
      );
    }

    const board = await prisma.boardCategory.findUnique({
      where: { id: boardId },
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

    if (!board) {
      return NextResponse.json(
        { ok: false, message: "게시판을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        board: {
          id: board.id,
          slug: board.slug,
          name: board.name,
          minPostLevel: board.minPostLevel,
          postCount: board._count.posts,
          createdAt: board.createdAt.toISOString(),
          updatedAt: board.updatedAt.toISOString(),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Board GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: "게시판을 불러오는 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 게시판 수정
 * Body: { name?: string, minPostLevel?: number }
 * 
 * 중요: minPostLevel 변경 시 즉시 새 게시물에 적용되며, 기존 게시물은 영향받지 않습니다.
 */
export async function PATCH(req: NextRequest, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: gate.status }
    );
  }

  try {
    const { id } = await context.params;
    const boardId = Number(id);

    if (!Number.isFinite(boardId)) {
      return NextResponse.json(
        { ok: false, message: "유효하지 않은 게시판 ID입니다." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => null);
    const name = body?.name?.trim() as string | undefined;
    const minPostLevel = body?.minPostLevel as number | undefined;

    // 게시판 존재 확인
    const existingBoard = await prisma.boardCategory.findUnique({
      where: { id: boardId },
    });

    if (!existingBoard) {
      return NextResponse.json(
        { ok: false, message: "게시판을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 업데이트할 데이터 준비
    const updateData: {
      name?: string;
      minPostLevel?: number;
    } = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (minPostLevel !== undefined) {
      // minPostLevel 검증 (1-5 사이)
      const level = Number(minPostLevel);
      if (!Number.isInteger(level) || level < 1 || level > 5) {
        return NextResponse.json(
          { ok: false, message: "minPostLevel은 1-5 사이의 정수여야 합니다." },
          { status: 400 }
        );
      }
      updateData.minPostLevel = level;
    }

    // 변경사항이 없으면 현재 게시판 반환
    if (Object.keys(updateData).length === 0) {
      const board = await prisma.boardCategory.findUnique({
        where: { id: boardId },
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
            ...board!,
            createdAt: board!.createdAt.toISOString(),
            updatedAt: board!.updatedAt.toISOString(),
          },
        },
        { status: 200 }
      );
    }

    // 게시판 수정
    // 중요: minPostLevel 변경 시 즉시 새 게시물에 적용됩니다.
    // 기존 게시물은 영향받지 않습니다 (게시물 생성 시 동적으로 category.minPostLevel을 조회하므로).
    const board = await prisma.boardCategory.update({
      where: { id: boardId },
      data: updateData,
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
        message: "게시판이 수정되었습니다.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Board PATCH] Error:", error);
    return NextResponse.json(
      { ok: false, message: "게시판 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * 게시판 삭제
 * 주의: 게시판에 게시물이 있으면 삭제할 수 없습니다.
 */
export async function DELETE(req: NextRequest, context: RouteContext) {
  const gate = await requireAdmin();
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
      { status: gate.status }
    );
  }

  try {
    const { id } = await context.params;
    const boardId = Number(id);

    if (!Number.isFinite(boardId)) {
      return NextResponse.json(
        { ok: false, message: "유효하지 않은 게시판 ID입니다." },
        { status: 400 }
      );
    }

    // 게시판 존재 확인 및 게시물 개수 확인
    const board = await prisma.boardCategory.findUnique({
      where: { id: boardId },
      include: {
        _count: {
          select: {
            posts: true,
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { ok: false, message: "게시판을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 게시물이 있는 게시판은 삭제할 수 없음
    if (board._count.posts > 0) {
      return NextResponse.json(
        {
          ok: false,
          message: `게시물이 ${board._count.posts}개 있는 게시판은 삭제할 수 없습니다.`,
        },
        { status: 409 }
      );
    }

    // 게시판 삭제
    await prisma.boardCategory.delete({
      where: { id: boardId },
    });

    return NextResponse.json(
      { ok: true, message: "게시판이 삭제되었습니다." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Admin Board DELETE] Error:", error);
    return NextResponse.json(
      { ok: false, message: "게시판 삭제 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

