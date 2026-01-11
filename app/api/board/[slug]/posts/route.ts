// app/api/board/[slug]/posts/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addPoints, POINT_RULES } from "@/lib/points";
import { getLevel } from "@/lib/level";
import type { Prisma } from "@prisma/client";
import { cacheGetJson, cacheSetJson } from "@/lib/redis-cache";
// HTML sanitization is done on render, not on save

const NOTICE_SLUG = "notice";
// 건의사항 slug (목록/상세와 동일하게!)
const SUGGEST_SLUG = "free";

interface RouteContext {
  params: Promise<{
    slug: string;
  }>;
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;

    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") || "new").toLowerCase(); // new | best | hot

    // 17.5 app/api/board/[slug]/posts/route.ts
    const cacheKey = `cache:boardPosts:${slug}:${sort}`;
    const cached = await cacheGetJson<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined || "";
    const currentUser = session?.user as any | undefined;
    const currentUserId = currentUser?.id as string | undefined;
    const currentUserRole = currentUser?.role as string | undefined;
    const isAdmin = currentUserRole === "admin";

    const category = await prisma.boardCategory.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        minPostLevel: true,
      },
    });

    if (!category) {
      return NextResponse.json(
        { ok: false, message: "존재하지 않는 게시판입니다." },
        { status: 404 }
      );
    }

    const isNotice = slug === NOTICE_SLUG;
    const isSuggest = slug === SUGGEST_SLUG;

    // 사용자 포인트 및 레벨 조회 (레벨 체크용)
    let canViewHidden: boolean = isAdmin;
    if (currentUserId && !isAdmin) {
      const user = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { points: true },
      });
      if (user) {
        const userLevel = getLevel(user.points);
        // Lv.5+ (모더레이터)도 숨김 콘텐츠를 볼 수 있음
        canViewHidden = userLevel >= 5;
      }
    }

    // 정렬 로직
    const now = new Date();
    const hotFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // last 7 days

    let whereClause: Prisma.PostWhereInput = {
      categoryId: category.id,
      ...(canViewHidden ? {} : { isHidden: false }),
    };

    let orderByClause: any[] = [{ createdAt: "desc" }];

    if (sort === "best") {
      orderByClause = [{ voteScore: "desc" }, { upCount: "desc" }, { createdAt: "desc" }];
    }

    if (sort === "hot") {
      whereClause = { ...whereClause, createdAt: { gte: hotFrom } };
      orderByClause = [{ voteScore: "desc" }, { upCount: "desc" }, { createdAt: "desc" }];
    }

    // 공지사항의 경우 고정 게시물 우선
    if (isNotice) {
      orderByClause = [{ isPinned: "desc" }, ...orderByClause];
    }

    let posts: any[] = await prisma.post.findMany({
      where: whereClause,
      orderBy: orderByClause,
      select: {
        id: true,
        title: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        categoryId: true,
        authorId: true,
        isPinned: true,
        isHidden: true,
        hiddenAt: true,
        hiddenReason: true,
        viewCount: true,
        upCount: true,
        downCount: true,
        voteScore: true,
        adminReply: true,
        adminRepliedAt: true,
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            points: true,
            equippedIcon: {
              select: {
                iconKey: true,
                source: true,
              },
            },
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
      take: 50,
    });

    // 사용자의 투표 상태 조회 및 추가
    if (userId && posts.length) {
      const postIds = posts.map((p: any) => p.id);

      const myVotes = await prisma.postVote.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true, value: true },
      });

      const map = new Map(myVotes.map((v) => [v.postId, v.value]));

      posts = posts.map((p: any) => ({
        ...p,
        myVote: map.get(p.id) ?? 0,
      }));
    } else {
      posts = posts.map((p: any) => ({ ...p, myVote: 0 }));
    }

    // 17.5 app/api/board/[slug]/posts/route.ts
    const payload = { ok: true, posts };
    await cacheSetJson(cacheKey, payload, 15);
    return NextResponse.json(payload);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
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
    const rawContent = body?.content as string | undefined;

    if (!title || !rawContent) {
      return NextResponse.json(
        { ok: false, message: "제목과 내용을 모두 입력해 주세요." },
        { status: 400 }
      );
    }

    // 로깅: 들어오는 content 확인
    console.log("[Post Create] Incoming content (first 300 chars):", rawContent.substring(0, 300));
    const hasTextAlignIncoming = /style="[^"]*text-align:\s*[^"]*"/i.test(rawContent);
    const hasColorIncoming = /style="[^"]*color:\s*[^"]*"/i.test(rawContent);
    console.log("[Post Create] Has text-align style in incoming:", hasTextAlignIncoming);
    console.log("[Post Create] Has color style in incoming:", hasColorIncoming);

    // Save raw HTML content - no sanitization or manipulation
    // Sanitization is done on render, not on save
    const content = rawContent;

    const category = await prisma.boardCategory.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        minPostLevel: true,
      },
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

    // ============================================
    // 레벨 기반 게시물 작성 권한 체크 (서버 사이드 강제)
    // ============================================
    // 이 체크는 서버 사이드에서 반드시 실행되며, 클라이언트 사이드 체크를 우회할 수 없습니다.
    // 1. 게시판의 minPostLevel 조회
    // 2. 사용자의 포인트에서 레벨 계산 (DB에 저장되지 않음, 동적 계산)
    // 3. userLevel < board.minPostLevel이면 403 Forbidden 반환
    // 관리자는 레벨 제한을 우회합니다.
    if (!isAdmin) {
      // 사용자 정보 조회 (포인트 포함)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
      });

      if (!user) {
        return NextResponse.json(
          { ok: false, message: "사용자 정보를 찾을 수 없습니다." },
          { status: 404 }
        );
      }

      // 사용자 레벨 계산 (DB에 저장되지 않음, 포인트에서 동적으로 계산)
      const userLevel = getLevel(user.points);

      // 레벨이 부족하면 요청 거부 및 인증 오류 반환
      if (userLevel < category.minPostLevel) {
        return NextResponse.json(
          {
            ok: false,
            message: `This board requires Lv.${category.minPostLevel} or higher. Your current level is Lv.${userLevel}.`,
            requiredLevel: category.minPostLevel,
            currentLevel: userLevel,
          },
          { status: 403 } // 403 Forbidden: 권한 없음
        );
      }
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

    // 게시물 작성자에게 포인트 지급 (+5 포인트)
    await addPoints(userId, POINT_RULES.POST_CREATE, "POST_CREATE", String(post.id));

    // 로깅: 저장 후 DB에서 읽어온 content 확인
    const savedPost = await prisma.post.findUnique({
      where: { id: post.id },
      select: { content: true },
    });

    if (savedPost) {
      console.log("[Post Create] Saved content from DB (first 300 chars):", savedPost.content.substring(0, 300));
      const hasTextAlignSaved = /style="[^"]*text-align:\s*[^"]*"/i.test(savedPost.content);
      const hasColorSaved = /style="[^"]*color:\s*[^"]*"/i.test(savedPost.content);
      console.log("[Post Create] Has text-align style in saved:", hasTextAlignSaved);
      console.log("[Post Create] Has color style in saved:", hasColorSaved);
      
      // 스타일 보존 여부 확인
      if (hasTextAlignIncoming && !hasTextAlignSaved) {
        console.warn("[Post Create] ⚠️ text-align style was removed during save!");
      }
      if (hasColorIncoming && !hasColorSaved) {
        console.warn("[Post Create] ⚠️ color style was removed during save!");
      }
      if (hasTextAlignIncoming && hasTextAlignSaved && hasColorIncoming && hasColorSaved) {
        console.log("[Post Create] ✅ Styles preserved: text-align and color both exist in saved content");
      }
    }

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
    const rawContent = body?.content as string | undefined;

    // 로깅: 들어오는 content 확인 (PUT - 수정)
    if (rawContent) {
      console.log("[Post Update] Incoming content (first 300 chars):", rawContent.substring(0, 300));
      const hasTextAlignIncomingUpdate = /style="[^"]*text-align:\s*[^"]*"/i.test(rawContent);
      const hasColorIncomingUpdate = /style="[^"]*color:\s*[^"]*"/i.test(rawContent);
      console.log("[Post Update] Has text-align style in incoming:", hasTextAlignIncomingUpdate);
      console.log("[Post Update] Has color style in incoming:", hasColorIncomingUpdate);
    }

    // Save raw HTML content - no sanitization or manipulation
    // Sanitization is done on render, not on save
    const content = rawContent;

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

    // 로깅: 저장 후 DB에서 읽어온 content 확인 (PUT - 수정)
    if (rawContent) {
      const savedPostUpdate = await prisma.post.findUnique({
        where: { id: updatedPost.id },
        select: { content: true },
      });

      if (savedPostUpdate) {
        console.log("[Post Update] Saved content from DB (first 300 chars):", savedPostUpdate.content.substring(0, 300));
        const hasTextAlignSavedUpdate = /style="[^"]*text-align:\s*[^"]*"/i.test(savedPostUpdate.content);
        const hasColorSavedUpdate = /style="[^"]*color:\s*[^"]*"/i.test(savedPostUpdate.content);
        console.log("[Post Update] Has text-align style in saved:", hasTextAlignSavedUpdate);
        console.log("[Post Update] Has color style in saved:", hasColorSavedUpdate);
        
        // 스타일 보존 여부 확인
        const hasTextAlignIncomingUpdate = /style="[^"]*text-align:\s*[^"]*"/i.test(rawContent);
        const hasColorIncomingUpdate = /style="[^"]*color:\s*[^"]*"/i.test(rawContent);
        if (hasTextAlignIncomingUpdate && !hasTextAlignSavedUpdate) {
          console.warn("[Post Update] ⚠️ text-align style was removed during save!");
        }
        if (hasColorIncomingUpdate && !hasColorSavedUpdate) {
          console.warn("[Post Update] ⚠️ color style was removed during save!");
        }
        if (hasTextAlignIncomingUpdate && hasTextAlignSavedUpdate && hasColorIncomingUpdate && hasColorSavedUpdate) {
          console.log("[Post Update] ✅ Styles preserved: text-align and color both exist in saved content");
        }
      }
    }

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