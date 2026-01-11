// C:\ticketcall\app\board\[slug]\[postID]\page.tsx
// app/board/[slug]/[postID]/page.tsx
import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import CommentsClient, {
  CommentItem,
} from "@/components/board/comments-client";
import PostContent from "@/components/board/post-content";
import PostVoteButtons from "@/components/board/post-vote-buttons";
import PostActionsBar from "@/components/board/post-actions-bar";
import { sanitizeForRender } from "@/lib/html-sanitize";
import { getNicknameStyleFromPoints } from "@/lib/points";
import { getLevel } from "@/lib/level";
import { getUsersBadgesBatch } from "@/lib/badges";
import UserBadge from "@/components/board/user-badge";
import LevelBadge from "@/components/board/level-badge";
import { canReportPost, canHideContent } from "@/lib/permissions";
import SendMessageButton from "@/components/messages/send-message-button";

const NOTICE_SLUG = "notice";
// 🔥 건의사항 slug: /board/free 기준
const SUGGEST_SLUG = "free";
const DONE_PREFIX = "[완료] ";

interface PageProps {
  params: Promise<{
    slug: string;
    postID: string;
  }>;
}

export default async function PostDetailPage({ params }: PageProps) {
  const { slug, postID } = await params;

  if (!slug || !postID) {
    notFound();
  }

  const category = await prisma.boardCategory.findUnique({
    where: { slug },
  });

  if (!category) {
    notFound();
  }

  const postIdNum = Number(postID);
  if (!Number.isFinite(postIdNum)) {
    notFound();
  }

  // 먼저 게시글이 존재하는지 확인
  const postExists = await prisma.post.findUnique({
    where: { id: postIdNum },
    select: { id: true, categoryId: true },
  });

  if (!postExists) {
    console.error(`[PostDetail] Post not found: postID=${postID}, slug=${slug}`);
    notFound();
  }

  // 세션 및 권한 확인 (댓글 필터링을 위해 먼저 확인)
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;
  const currentUserRole = currentUser?.role as string | undefined;
  const isAdmin = currentUserRole === "admin";
  
  // 레벨 기반 권한 확인 (댓글 필터링을 위해)
  let canHide: boolean = false;
  if (currentUserId && !isAdmin) {
    const userData = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { points: true },
    });
    if (userData && (userData as any).points !== undefined) {
      const userLevel = getLevel((userData as any).points);
      canHide = canHideContent(userLevel);
    }
  } else if (isAdmin) {
    canHide = true;
  }

  // 조회수 증가 (페이지 로드 시 자동 증가)
  const post = await prisma.post.update({
    where: { id: postIdNum },
    data: {
      viewCount: {
        increment: 1,
      },
    },
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
      comments: {
        orderBy: { createdAt: "asc" },
        where: isAdmin || canHide ? {} : { isHidden: false }, // 관리자 또는 Lv.5+는 숨김 댓글도 표시
        select: {
          id: true,
          content: true,
          createdAt: true,
          isHidden: true,
          hiddenAt: true,
          hiddenReason: true,
          postId: true,
          authorId: true,
          // include the scalar fields here:
          upCount: true,
          downCount: true,
          voteScore: true,

          // relations can also be selected with nested select:
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              points: true,
              equippedIcon: {
                select: { iconKey: true, source: true },
              },
            },
          },
          votes: {
            select: { value: true, userId: true }, // add userId if you compute myVote client-side
          },
        },
      },
      category: true,
    },
  });

  if (post.categoryId !== category.id) {
    console.error(`[PostDetail] Category mismatch: post.categoryId=${post.categoryId}, category.id=${category.id}, slug=${slug}`);
    notFound();
  }

  // 세션은 이미 위에서 확인했으므로 재사용
  const isAuthor = !!currentUserId && currentUserId === post.authorId;

  const isNotice = slug === NOTICE_SLUG;
  const isSuggest = slug === SUGGEST_SLUG;

  // 🔥 숨김 처리된 글은 관리자만 접근 가능
  if (post.isHidden && !isAdmin) {
    console.error(`[PostDetail] Hidden post access denied: postID=${postID}, userId=${currentUserId}, isAdmin=${isAdmin}`);
    notFound();
  }

  // 🔥 건의사항: 작성자 + 관리자만 페이지 접근 가능
  if (isSuggest && !isAdmin && !isAuthor) {
    console.error(`[PostDetail] Suggest post access denied: postID=${postID}, slug=${slug}, userId=${currentUserId}, post.authorId=${post.authorId}, isAdmin=${isAdmin}, isAuthor=${isAuthor}`);
    // 건의사항은 작성자와 관리자만 볼 수 있으므로 404 대신 권한 없음 페이지로 리다이렉트
    redirect(`/board/${slug}?error=access_denied`);
  }

  // 댓글의 사용자 투표 상태 조회
  let commentVotesMap = new Map<number, number>();
  if (currentUserId && post.comments.length > 0) {
    const commentIds = post.comments.map((c) => c.id);
    const userCommentVotes = await prisma.commentVote.findMany({
      where: { userId: currentUserId, commentId: { in: commentIds } },
      select: { commentId: true, value: true },
    });
    commentVotesMap = new Map(userCommentVotes.map((v) => [v.commentId, v.value]));
  }

  const initialComments: CommentItem[] = post.comments.map((c: typeof post.comments[0]) => {
    return {
      id: c.id,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      authorId: c.authorId,
      author: c.author
        ? {
            id: c.author.id,
            name: c.author.name,
            points: (c.author as any).points ?? 0, // 레벨 기반 스타일링을 위해 포인트 포함
            equippedIcon: c.author.equippedIcon
              ? {
                  iconKey: c.author.equippedIcon.iconKey,
                  source: c.author.equippedIcon.source,
                }
              : null,
          }
        : null,
      voteUp: (c as any).upCount ?? 0,
      voteDown: (c as any).downCount ?? 0,
      voteScore: (c as any).voteScore ?? 0,
      myVote: commentVotesMap.get(c.id) ?? 0,
    };
  });

  // 투표 수 계산
  const voteUp = post.votes.filter((v) => v.value === 1).length;
  const voteDown = post.votes.filter((v) => v.value === -1).length;

  // 사용자의 투표 상태 조회
  let myVote = 0;
  if (currentUserId && post.id) {
    const userVote = await prisma.postVote.findUnique({
      where: { postId_userId: { postId: post.id, userId: currentUserId } },
      select: { value: true },
    });
    myVote = userVote?.value ?? 0;
  }

  const isDone = post.title.startsWith(DONE_PREFIX);
  const displayTitle = post.title;
  const hasAdminReply = !!post.adminReply;

  // 현재 사용자의 레벨 조회 (신고 권한 체크용 및 메시지 전송 버튼용)
  let canReport: boolean = false;
  let currentUserPoints: number = 0;
  
  if (currentUserId) {
    if (isAdmin) {
      // 관리자는 모든 권한 보유
      canReport = true;
    } else {
      const currentUser = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: { points: true },
      });
      
      if (currentUser && (currentUser as any).points !== undefined) {
        currentUserPoints = (currentUser as any).points;
        const currentUserLevel = getLevel(currentUserPoints);
        canReport = canReportPost(currentUserLevel);
      }
    }
  } else if (isAdmin && currentUserId) {
    // 관리자는 포인트가 0이어도 메시지 전송 가능 (레벨 제한 우회)
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { points: true },
    });
    if (currentUser && (currentUser as any).points !== undefined) {
      currentUserPoints = (currentUser as any).points;
    }
  }

  // 작성자들의 배지 계산 (게시물 작성자 + 댓글 작성자들)
  const authorIds = [
    post.authorId,
    ...post.comments.map((c) => c.authorId),
  ].filter((id): id is string => !!id);
  const badgesMap = await getUsersBadgesBatch(authorIds, slug);

  // 🔧 Server Actions 정의
  async function togglePinAction(formData: FormData) {
    "use server";
    const postId = Number(formData.get("postId"));
    const slug = String(formData.get("slug") ?? "");
    const postID = String(formData.get("postID") ?? "");
    const currentIsPinned = formData.get("isPinned") === "true";

    if (!postId || !slug || !postID) {
      redirect(`/board/${slug}`);
    }

    await prisma.post.update({
      where: { id: postId },
      data: {
        isPinned: !currentIsPinned,
      },
    });
    redirect(`/board/${slug}/${postID}`);
  }

  async function markDoneAction(formData: FormData) {
    "use server";
    const postId = Number(formData.get("postId"));
    const slug = String(formData.get("slug") ?? "");
    const postID = String(formData.get("postID") ?? "");
    const currentTitle = String(formData.get("title") ?? "");

    if (!postId || !slug || !postID || !currentTitle) {
      redirect(`/board/${slug}`);
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        title: currentTitle.startsWith(DONE_PREFIX)
          ? currentTitle
          : DONE_PREFIX + currentTitle,
      },
    });

    // 🔔 알림: 건의 완료
    if (updated.authorId) {
      await prisma.notification.create({
        data: {
          userId: updated.authorId,
          type: "suggest_done",
          message: `건의가 완료 처리되었습니다: "${currentTitle}"`,
        },
      });
    }

    redirect(`/board/${slug}/${postID}`);
  }

  async function toggleHiddenAction(formData: FormData) {
    "use server";
    const postId = Number(formData.get("postId"));
    const slug = String(formData.get("slug") ?? "");
    const currentIsHidden = formData.get("isHidden") === "true";
    const reason = String(formData.get("reason") ?? "");

    if (!postId || !slug) {
      redirect("/");
    }

    // 권한 체크 (관리자 또는 Lv.5+)
    const session = await getServerSession(authOptions);
    const user = session?.user as any | undefined;
    
    if (!user?.id) {
      redirect("/");
    }

    const userId = user.id as string;
    const isAdmin = user.role === "admin";

    if (!isAdmin) {
      const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: { points: true },
      });

      if (!userData || (userData as any).points === undefined) {
        redirect("/");
      }

      const userLevel = getLevel((userData as any).points);
      if (!canHideContent(userLevel)) {
        redirect("/");
      }
    }

    // 숨김 처리 및 로그 기록
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({
        where: { id: postId },
        select: { isHidden: true },
      });

      if (!post) {
        return;
      }

      const newHiddenState = !currentIsHidden;
      const now = new Date();

      await tx.post.update({
        where: { id: postId },
        data: newHiddenState
          ? {
              isHidden: true,
              hiddenAt: now,
              hiddenReason: reason.trim() || "게시글 숨김 처리",
            }
          : {
              isHidden: false,
              hiddenAt: null,
              hiddenReason: null,
            },
      });

      // AdminActionLog 기록
      await tx.adminActionLog.create({
        data: {
          adminId: userId,
          actionType: newHiddenState ? "HIDE_POST" : "UNHIDE_POST",
          targetType: "POST",
          targetId: String(postId),
          reason: reason.trim() || (newHiddenState ? "게시글 숨김 처리" : "게시글 숨김 해제"),
          oldValue: JSON.stringify({ isHidden: post.isHidden }),
          newValue: JSON.stringify({ isHidden: newHiddenState, hiddenAt: newHiddenState ? now : null, hiddenReason: newHiddenState ? (reason.trim() || "게시글 숨김 처리") : null }),
        },
      });
    });

    redirect(`/board/${slug}/${postID}`);
  }

  async function deletePostAction(formData: FormData) {
    "use server";
    const postId = Number(formData.get("postId"));
    const slug = String(formData.get("slug") ?? "");

    if (!postId || !slug) {
      redirect("/");
    }

    // 세션 확인
    const session = await getServerSession(authOptions);
    const user = session?.user as any | undefined;
    
    if (!user?.id) {
      redirect("/");
    }

    const userId = user.id as string;

    // 권한 확인 (작성자 또는 관리자만 삭제 가능)
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) {
      redirect(`/board/${slug}`);
    }

    const isAdmin = user.role === "admin";
    if (!isAdmin && post.authorId !== userId) {
      redirect(`/board/${slug}`);
    }

    // 소프트 삭제 (숨김 처리)
    const now = new Date();
    await prisma.post.update({
      where: { id: postId },
      data: {
        isHidden: true,
        hiddenAt: now,
        hiddenReason: "작성자에 의한 삭제",
      },
    });

    redirect(`/board/${slug}`);
  }

  async function reportPostAction(formData: FormData) {
    "use server";
    const postId = Number(formData.get("postId"));
    const reporterId = String(formData.get("reporterId") ?? "");

    if (!postId || !reporterId) {
      return;
    }

    // 레벨 기반 권한 체크 (Lv.4+ 필요)
    const reporter = await prisma.user.findUnique({
      where: { id: reporterId },
    });

    if (!reporter) {
      return;
    }

    const reporterIsAdmin = reporter.role === "admin";
    if (!reporterIsAdmin) {
      if ((reporter as any).points === undefined) {
        return;
      }
      const reporterLevel = getLevel((reporter as any).points);
      if (!canReportPost(reporterLevel)) {
        // 권한 없음 - 조용히 실패 (UI에서 이미 숨겨져 있음)
        return;
      }
    }

    await prisma.report.create({
      data: {
        targetType: "POST",
        targetId: postId,
        reporterId: reporterId,
        reason: "사용자 신고",
      } as any,
    });
  }

  async function updateAdminReplyAction(formData: FormData) {
    "use server";
    const postId = Number(formData.get("postId"));
    const slug = String(formData.get("slug") ?? "");
    const postID = String(formData.get("postID") ?? "");
    const reply = formData.get("adminReply");
    const replyText = typeof reply === "string" ? reply.trim() : "";

    if (!postId || !slug || !postID) {
      redirect("/");
    }

    const postData = await prisma.post.findUnique({
      where: { id: postId },
      select: { title: true, authorId: true },
    });

    if (!postData) {
      redirect(`/board/${slug}`);
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        adminReply: replyText.length > 0 ? replyText : null,
        adminRepliedAt: replyText.length > 0 ? new Date() : null,
      },
    });

    // 🔔 알림: 관리자 답변 등록
    if (updated.authorId && replyText.length > 0) {
      await prisma.notification.create({
        data: {
          userId: updated.authorId,
          type: "admin_reply",
          message: `건의에 대한 관리자 답변이 등록되었습니다: "${postData.title}"`,
        },
      });
    }

    redirect(`/board/${slug}/${postID}`);
  }

  return (
    <main className="container mx-auto py-10 space-y-6 pb-20 md:pb-10">
      <PostActionsBar postId={post.id} />
      
      <header className="space-y-1 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {displayTitle}
          </h1>
          <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
            <span>게시판: {category.name}</span>
            <span className="flex items-center gap-1.5">
              작성자:{" "}
              <span
                className={
                  (post.author as any)?.points !== undefined
                    ? getNicknameStyleFromPoints((post.author as any).points)
                    : ""
                }
              >
                {post.author?.name ?? "익명"}
              </span>
              {(post.author as any)?.points !== undefined && (
                <LevelBadge points={(post.author as any).points} />
              )}
              {post.authorId && badgesMap[post.authorId] && (
                <UserBadge badges={badgesMap[post.authorId]} />
              )}
              {/* 메시지 보내기 버튼 (로그인 사용자에게만 표시, 자기 자신 제외) */}
              {currentUserId && currentUserId !== post.authorId && (
                <SendMessageButton
                  receiverId={post.authorId}
                  receiverName={post.author?.name ?? "익명"}
                  senderPoints={currentUserPoints}
                />
              )}
            </span>
            <span>
              {post.createdAt.toLocaleString("ko-KR", {
                timeZone: "Asia/Seoul",
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span className="flex items-center gap-1">
              👁️ 조회 {post.viewCount ?? 0}
            </span>
            {isNotice && post.isPinned && (
              <span className="font-semibold text-orange-600">
                상단 고정 공지
              </span>
            )}
            {post.isHidden && (
              <span className="font-semibold text-red-600">
                숨김 처리됨
              </span>
            )}
            {isSuggest && hasAdminReply && (
              <span className="font-semibold text-green-700">
                관리자 답변 완료
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {/* 🔥 공지 게시판: 관리자 전용 상단 고정/해제 버튼 */}
          {isNotice && isAdmin && (
            <form action={togglePinAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="postID" value={postID} />
              <input type="hidden" name="isPinned" value={String(post.isPinned)} />
              <button
                type="submit"
                className="text-sm px-3 py-1 rounded bg-yellow-600 text-white"
              >
                {post.isPinned ? "고정 해제" : "상단 고정"}
              </button>
            </form>
          )}

          {/* 🔥 관리자 전용: 건의사항 완료 표시 버튼 */}
          {isSuggest && isAdmin && !isDone && (
            <form action={markDoneAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="postID" value={postID} />
              <input type="hidden" name="title" value={post.title} />
              <button
                type="submit"
                className="text-sm px-3 py-1 rounded bg-green-600 text-white"
              >
                완료 처리
              </button>
            </form>
          )}

          {/* 🔥 숨김/해제 버튼 (관리자 또는 Lv.5+) */}
          {(isAdmin || canHide) && (
            <form action={toggleHiddenAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="isHidden" value={String(post.isHidden)} />
              <input type="hidden" name="reason" value="" />
              <button
                type="submit"
                className="text-sm px-3 py-1 rounded bg-gray-700 text-white"
              >
                {post.isHidden ? "숨김 해제" : "숨기기"}
              </button>
            </form>
          )}

          {/* 수정/삭제 버튼: 작성자 + 관리자 */}
          {(isAdmin || isAuthor) && (
            <>
              <form action={`/board/${slug}/${postID}/edit`}>
                <button
                  type="submit"
                  className="text-sm px-3 py-1 rounded bg-blue-600 text-white"
                >
                  수정
                </button>
              </form>

              <form action={deletePostAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="slug" value={slug} />
                <button
                  type="submit"
                  className="text-sm px-3 py-1 rounded bg-red-600 text-white"
                >
                  삭제
                </button>
              </form>
            </>
          )}

          {/* 🔥 로그인한 유저라면 신고 버튼 (게시글 신고, Lv.4+ 필요) */}
          {currentUserId ? (
            isAdmin || canReport ? (
              <form action={reportPostAction}>
                <input type="hidden" name="postId" value={post.id} />
                <input type="hidden" name="reporterId" value={currentUserId} />
                <button
                  type="submit"
                  className="text-sm px-3 py-1 rounded border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                >
                  신고
                </button>
              </form>
            ) : (
              <button
                type="button"
                disabled
                className="text-sm px-3 py-1 rounded border border-gray-300 text-gray-400 cursor-not-allowed opacity-60"
                title="신고 기능은 Lv.4 이상부터 사용할 수 있습니다."
              >
                신고 (Lv.4+)
              </button>
            )
          ) : null}
        </div>
      </header>

      {/* 본문 */}
      <section className="border rounded-md p-4 text-sm leading-relaxed space-y-4">
        <PostContent content={sanitizeForRender(post.content)} />
        
        {/* 투표 버튼 */}
        <div className="mt-4 pt-4 border-t">
          <PostVoteButtons
            postId={post.id}
            initialUp={voteUp}
            initialDown={voteDown}
            initialMyVote={myVote ?? 0}
          />
        </div>

        {/* 🔥 건의사항 + 관리자 답변이 있는 경우, 답변 박스 */}
        {isSuggest && hasAdminReply && (
          <div className="mt-4 border-t pt-4 text-sm">
            <h2 className="font-semibold mb-1">관리자 답변</h2>
            <p className="whitespace-pre-wrap">{post.adminReply}</p>
            {post.adminRepliedAt && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                답변 시간:{" "}
                {post.adminRepliedAt.toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
        )}

        {/* 🔥 관리자일 때: 답변 작성/수정 폼 */}
        {isSuggest && isAdmin && (
          <form action={updateAdminReplyAction} className="mt-6 space-y-2">
            <input type="hidden" name="postId" value={post.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="postID" value={postID} />
            <label className="text-sm font-medium block">
              관리자 답변 작성/수정
            </label>
            <textarea
              name="adminReply"
              defaultValue={post.adminReply ?? ""}
              className="w-full border rounded-md p-2 text-sm min-h-[80px]"
              placeholder="사용자 건의에 대한 공식 답변을 입력하세요."
            />
            <button
              type="submit"
              className="text-sm px-3 py-1 rounded bg-black text-white"
            >
              답변 저장
            </button>
          </form>
        )}
      </section>

      {/* 댓글 섹션 */}
      <section className="space-y-4 border-top pt-4">
        <h2 className="text-sm font-semibold">댓글</h2>

        <CommentsClient
          postId={post.id}
          slug={slug}
          isNotice={isNotice}
          currentUserId={currentUserId}
          currentUserRole={currentUserRole}
          initialComments={initialComments}
          badgesMap={badgesMap}
          canHide={canHide}
        />
      </section>
    </main>
  );
}
