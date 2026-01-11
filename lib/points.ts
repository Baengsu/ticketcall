/**
 * 포인트 시스템 유틸리티
 * 
 * 중앙화된 포인트 관리 시스템
 * - 포인트는 누적되며 절대 리셋되지 않음
 * - 포인트는 다운보트로만 감소할 수 있음
 * - 투표자는 절대 포인트를 얻거나 잃지 않음
 * - 콘텐츠 작성자만 포인트를 받음
 * 
 * 포인트 규칙:
 * - 게시물 생성: +5 포인트 (게시물 작성자)
 * - 게시물 추천: +3 포인트 (게시물 작성자)
 * - 게시물 비추천: -3 포인트 (게시물 작성자)
 * - 댓글 추천: +1 포인트 (댓글 작성자)
 * - 댓글 비추천: -1 포인트 (댓글 작성자)
 * - 일일 로그인: +5 포인트 (하루에 한 번)
 */

import prisma from "@/lib/prisma";
import { getLevel } from "./level";

/**
 * 포인트 규칙 상수
 * 모든 포인트는 누적되며 절대 리셋되지 않습니다.
 */
export const POINT_RULES = {
  POST_CREATE: 5, // 게시물 생성: +5 포인트 (게시물 작성자)
  POST_UPVOTE: 3, // 게시물 추천: +3 포인트 (게시물 작성자)
  POST_DOWNVOTE: -3, // 게시물 비추천: -3 포인트 (게시물 작성자)
  COMMENT_UPVOTE: 1, // 댓글 추천: +1 포인트 (댓글 작성자)
  COMMENT_DOWNVOTE: -1, // 댓글 비추천: -1 포인트 (댓글 작성자)
  DAILY_LOGIN: 5, // 일일 로그인: +5 포인트 (하루에 한 번)
} as const;

/**
 * 트랜잭션 내부에서 포인트를 추가하는 내부 함수
 * 트랜잭션 클라이언트를 받아서 작업을 수행합니다.
 * 
 * @param tx - Prisma 트랜잭션 클라이언트
 * @param userId - 포인트를 받을 사용자 ID
 * @param amount - 추가할 포인트 양 (양수 또는 음수, 음수 허용)
 * @param reason - 포인트 변경 이유 (예: "POST_CREATE", "POST_UPVOTE")
 * @param refId - 참조 ID (postId 또는 commentId를 문자열로, 선택적)
 * @returns 업데이트된 사용자의 포인트 (누적)
 */
async function addPointsInternal(
  tx: any, // Prisma.TransactionClient
  userId: string,
  amount: number,
  reason: string,
  refId?: string | null
): Promise<number> {
  if (amount === 0) {
    // 포인트 변화가 없으면 현재 포인트만 조회
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { points: true },
    });
    return user?.points ?? 0;
  }

  // 1. 포인트 히스토리 레코드 먼저 생성
  await tx.pointHistory.create({
    data: {
      userId,
      amount,
      reason,
      refId: refId ?? null,
    },
  });

  // 2. 포인트 업데이트 (원자적 연산, 누적, 음수 허용)
  const user = await tx.user.update({
    where: { id: userId },
    data: {
      points: {
        increment: amount,
      },
    },
    select: {
      points: true,
    },
  });

  return user.points;
}

/**
 * 특정 사용자에게 포인트를 추가하는 함수
 * 
 * 포인트는 누적되며 절대 리셋되지 않습니다.
 * increment 연산을 사용하여 원자적으로 업데이트됩니다.
 * 포인트 변경 시 PointHistory 레코드가 먼저 생성되고, 그 다음 User.points가 업데이트됩니다.
 * 
 * @param userId - 포인트를 받을 사용자 ID
 * @param amount - 추가할 포인트 양 (양수 또는 음수, 음수 허용)
 * @param reason - 포인트 변경 이유 (예: "POST_CREATE", "POST_UPVOTE")
 * @param refId - 참조 ID (postId 또는 commentId를 문자열로, 선택적)
 * @returns 업데이트된 사용자의 포인트 (누적)
 * 
 * @example
 * // 게시물 작성자에게 +5 포인트 (게시물 생성)
 * await addPoints(authorId, POINT_RULES.POST_CREATE, "POST_CREATE", String(postId));
 * 
 * @example
 * // 게시물 작성자에게 +3 포인트 (게시물 추천)
 * await addPoints(postAuthorId, POINT_RULES.POST_UPVOTE, "POST_UPVOTE", String(postId));
 * 
 * @example
 * // 게시물 작성자에게 -3 포인트 (게시물 비추천)
 * await addPoints(postAuthorId, POINT_RULES.POST_DOWNVOTE, "POST_DOWNVOTE", String(postId));
 */
export async function addPoints(
  userId: string,
  amount: number,
  reason: string,
  refId?: string
): Promise<number> {
  // 트랜잭션으로 원자적 처리
  return await prisma.$transaction(async (tx) => {
    return await addPointsInternal(tx, userId, amount, reason, refId);
  });
}

/**
 * 트랜잭션 내부에서 사용할 수 있는 포인트 추가 함수 (export)
 * 외부 트랜잭션 내에서 포인트를 추가할 때 사용합니다.
 * 
 * @param tx - Prisma 트랜잭션 클라이언트
 * @param userId - 포인트를 받을 사용자 ID
 * @param amount - 추가할 포인트 양 (양수 또는 음수, 음수 허용)
 * @param reason - 포인트 변경 이유 (예: "POST_CREATE", "POST_UPVOTE")
 * @param refId - 참조 ID (postId 또는 commentId를 문자열로, 선택적)
 * @returns 업데이트된 사용자의 포인트 (누적)
 */
export async function addPointsInTransaction(
  tx: any, // Prisma.TransactionClient
  userId: string,
  amount: number,
  reason: string,
  refId?: string | null
): Promise<number> {
  return await addPointsInternal(tx, userId, amount, reason, refId);
}

/**
 * 레벨에 따른 닉네임 스타일 클래스 반환
 * DB에 저장되지 않고, 포인트에서 계산된 레벨을 기반으로 동적으로 스타일을 반환합니다.
 * 
 * 레벨별 색상 규칙:
 * - Lv.1: 기본 색상 (빈 문자열 반환)
 * - Lv.2: text-green-600
 * - Lv.3: text-blue-600
 * - Lv.4: text-purple-600
 * - Lv.5: text-red-600 font-bold
 * 
 * @param level - 사용자 레벨 (1-5)
 * @returns Tailwind CSS 클래스 문자열
 * 
 * @example
 * getNicknameStyleClass(1) // ""
 * getNicknameStyleClass(2) // "text-green-600"
 * getNicknameStyleClass(5) // "text-red-600 font-bold"
 */
export function getNicknameStyleClass(level: number): string {
  switch (level) {
    case 1:
      return ""; // 기본 색상
    case 2:
      return "text-green-600 dark:text-green-400";
    case 3:
      return "text-blue-600 dark:text-blue-400";
    case 4:
      return "text-purple-600 dark:text-purple-400";
    case 5:
      return "text-red-600 dark:text-red-400 font-bold";
    default:
      return ""; // 기본 색상
  }
}

/**
 * 포인트에서 닉네임 스타일 클래스 직접 계산
 * 
 * @param points - 사용자 포인트
 * @returns Tailwind CSS 클래스 문자열
 */
export function getNicknameStyleFromPoints(points: number): string {
  const level = getLevel(points); // lib/level.ts의 getLevel 사용
  return getNicknameStyleClass(level);
}

/**
 * 일일 로그인 포인트 지급
 * 사용자가 오늘 이미 로그인 포인트를 받았는지 확인하고,
 * 받지 않았다면 포인트를 지급합니다.
 * 
 * @param userId - 사용자 ID
 * @returns 포인트가 지급되었는지 여부 (true = 지급됨, false = 이미 받음)
 */
export async function giveDailyLoginPoints(
  userId: string
): Promise<boolean> {
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // 사용자 정보 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastLogin: true,
      points: true,
    },
  });

  if (!user) {
    return false;
  }

  // 오늘 이미 로그인했다면 포인트 지급하지 않음
  if (user.lastLogin && user.lastLogin >= todayStart) {
    return false;
  }

  // 포인트 지급 및 lastLogin 업데이트 (히스토리도 자동 생성됨)
  // addPointsInTransaction 사용하여 포인트 추가
  await prisma.$transaction(async (tx) => {
    // 포인트 추가 (PointHistory 생성 및 User.points 업데이트)
    await addPointsInternal(tx, userId, POINT_RULES.DAILY_LOGIN, "DAILY_LOGIN", null);

    // lastLogin 업데이트
    await tx.user.update({
      where: { id: userId },
      data: {
        lastLogin: now,
      },
    });
  });

  return true;
}

