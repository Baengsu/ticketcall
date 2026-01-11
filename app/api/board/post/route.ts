// app/api/board/post/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { addPoints, POINT_RULES } from "@/lib/points";
import { getLevel } from "@/lib/level";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get("postId");

    if (!postId || !Number.isFinite(Number(postId))) {
      return NextResponse.json(
        { ok: false, message: "게시물 ID가 필요합니다." },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    const userId = (session as any)?.user?.id as string | undefined || "";

    const post = await prisma.post.findUnique({
      where: { id: Number(postId) },
      include: {
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
        votes: {
          select: { value: true },
        },
        category: true,
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    if (!post) {
      return NextResponse.json(
        { ok: false, message: "게시물을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 사용자의 투표 상태 조회
    let myVote = 0;
    if (userId && post?.id) {
      const v = await prisma.postVote.findUnique({
        where: { postId_userId: { postId: post.id, userId } },
        select: { value: true },
      });
      myVote = v?.value ?? 0;
    }

    // 투표 수 계산
    const voteUp = post.votes.filter((v) => v.value === 1).length;
    const voteDown = post.votes.filter((v) => v.value === -1).length;

    return NextResponse.json({
      ok: true,
      post: {
        ...post,
        voteUp,
        voteDown,
        myVote,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

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
  const { slug, title, content: incomingContent } = await req.json();

  if (
    !slug ||
    typeof slug !== "string" ||
    !title?.trim() ||
    !incomingContent?.trim()
  ) {
    return NextResponse.json(
      { ok: false, message: "slug, 제목, 내용을 모두 입력해 주세요." },
      { status: 400 }
    );
  }

  // 로깅: 들어오는 content 확인
  console.log("[Post Create] Incoming content (first 300 chars):", incomingContent?.substring(0, 300));
  const hasTextAlignIncoming = /style="[^"]*text-align:\s*[^"]*"/i.test(incomingContent || "");
  const hasColorIncoming = /style="[^"]*color:\s*[^"]*"/i.test(incomingContent || "");
  console.log("[Post Create] Has text-align style in incoming:", hasTextAlignIncoming);
  console.log("[Post Create] Has color style in incoming:", hasColorIncoming);

  // 3. 카테고리 찾기
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

  // 4. 현재 로그인한 유저 찾기
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: {
      id: true,
      role: true,
      points: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { ok: false, message: "유저 정보를 찾을 수 없습니다." },
      { status: 400 }
    );
  }

  const isAdmin = user.role === "admin";

  // ============================================
  // 레벨 기반 게시물 작성 권한 체크 (서버 사이드 강제)
  // ============================================
  // 이 체크는 서버 사이드에서 반드시 실행되며, 클라이언트 사이드 체크를 우회할 수 없습니다.
  // 1. 게시판의 minPostLevel 조회
  // 2. 사용자의 포인트에서 레벨 계산 (DB에 저장되지 않음, 동적 계산)
  // 3. userLevel < board.minPostLevel이면 403 Forbidden 반환
  // 관리자는 레벨 제한을 우회합니다.
  if (!isAdmin) {
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

  // 5. 글 생성
  const post = await prisma.post.create({
    data: {
      title: title.trim(),
      content: incomingContent.trim(),
      categoryId: category.id,
      authorId: user.id,
    },
  });

  // 게시물 작성자에게 포인트 지급 (+5 포인트)
  await addPoints(user.id, POINT_RULES.POST_CREATE, "POST_CREATE", String(post.id));

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
    {
      ok: true,
      postId: post.id,
    },
    { status: 201 }
  );
}
