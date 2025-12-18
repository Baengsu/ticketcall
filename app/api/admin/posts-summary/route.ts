// C:\ticketcall\app\api\admin\posts-summary\route.ts
// app/api/admin/posts-summary/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user?.email || user.role !== "admin") {
    return NextResponse.json(
      { ok: false, message: "관리자만 접근할 수 있습니다." },
      { status: 403 }
    );
  }

  try {
    // Pinned notices
    const pinnedNotices = await prisma.post.findMany({
      where: {
        isPinned: true,
        isHidden: false,
        category: {
          slug: "notice",
        },
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // All hidden posts
    const hiddenPosts = await prisma.post.findMany({
      where: {
        isHidden: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const pinned = pinnedNotices.map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.createdAt.toISOString(),
      categoryName: p.category?.name ?? "",
      categorySlug: p.category?.slug ?? "",
      isPinned: p.isPinned,
      isHidden: p.isHidden,
    }));

    const hidden = hiddenPosts.map((p) => ({
      id: p.id,
      title: p.title,
      createdAt: p.createdAt.toISOString(),
      categoryName: p.category?.name ?? "",
      categorySlug: p.category?.slug ?? "",
      isPinned: p.isPinned,
      isHidden: p.isHidden,
    }));

    return NextResponse.json(
      {
        ok: true,
        pinnedNotices: pinned,
        hiddenPosts: hidden,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/admin/posts-summary", error);
    return NextResponse.json(
      { ok: false, pinnedNotices: [], hiddenPosts: [] },
      { status: 500 }
    );
  }
}
