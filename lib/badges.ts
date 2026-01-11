/**
 * 게시판별 배지 시스템
 * 
 * 배지는 계산되며 DB에 저장되지 않습니다.
 * 새로운 배지 규칙을 쉽게 추가할 수 있도록 설계되었습니다.
 */

import prisma from "@/lib/prisma";

/**
 * 배지 타입 정의
 */
export type BadgeType = "contributor" | "helper" | "expert" | "veteran";

/**
 * 배지 정보
 */
export interface BadgeInfo {
  type: BadgeType;
  label: string; // 표시될 텍스트
  color: string; // Tailwind CSS 색상 클래스
}

/**
 * 배지 맵 타입
 * 사용자 ID를 키로 하고, 해당 사용자의 배지 목록을 값으로 하는 맵
 */
export type BadgesMap = Record<string, BadgeInfo[]>;

/**
 * 배지 규칙 정의
 * 새로운 배지를 추가하려면 이 배열에 규칙을 추가하면 됩니다.
 */
export interface BadgeRule {
  type: BadgeType;
  label: string;
  color: string;
  boardSlug: string; // 게시판 slug (예: "free", "notice")
  condition: {
    type: "post_count" | "comment_count"; // 게시물 수 또는 댓글 수
    minCount: number; // 최소 개수
  };
}

/**
 * 배지 규칙 목록
 * 새로운 배지 규칙을 추가하려면 이 배열에 항목을 추가하세요.
 */
export const BADGE_RULES: BadgeRule[] = [
  {
    type: "contributor",
    label: "Contributor",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    boardSlug: "free", // 건의사항 게시판
    condition: {
      type: "post_count",
      minCount: 10, // 10개 이상의 게시물 작성
    },
  },
  // Q&A 게시판이 있다면 예시:
  // {
  //   type: "helper",
  //   label: "Helper",
  //   color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  //   boardSlug: "qa", // Q&A 게시판
  //   condition: {
  //     type: "comment_count",
  //     minCount: 20, // 20개 이상의 댓글 작성
  //   },
  // },
];

/**
 * 배지 정보 맵
 */
const BADGE_INFO_MAP: Record<BadgeType, BadgeInfo> = {
  contributor: {
    type: "contributor",
    label: "Contributor",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  },
  helper: {
    type: "helper",
    label: "Helper",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  },
  expert: {
    type: "expert",
    label: "Expert",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  },
  veteran: {
    type: "veteran",
    label: "Veteran",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  },
};

/**
 * 특정 사용자가 특정 게시판에서 획득한 배지들을 계산합니다.
 * 
 * @param userId - 사용자 ID
 * @param boardSlug - 게시판 slug (선택적, 없으면 모든 게시판)
 * @returns 획득한 배지 목록
 */
export async function getUserBadges(
  userId: string,
  boardSlug?: string
): Promise<BadgeInfo[]> {
  const earnedBadges: BadgeInfo[] = [];

  // 해당 사용자에 적용 가능한 배지 규칙만 필터링
  const applicableRules = boardSlug
    ? BADGE_RULES.filter((rule) => rule.boardSlug === boardSlug)
    : BADGE_RULES;

  for (const rule of applicableRules) {
    // 게시판 조회
    const board = await prisma.boardCategory.findUnique({
      where: { slug: rule.boardSlug },
      select: { id: true },
    });

    if (!board) {
      continue; // 게시판이 존재하지 않으면 건너뜀
    }

    let count = 0;

    if (rule.condition.type === "post_count") {
      // 게시물 수 조회
      count = await prisma.post.count({
        where: {
          authorId: userId,
          categoryId: board.id,
          isHidden: false, // 숨김 게시물 제외
        },
      });
    } else if (rule.condition.type === "comment_count") {
      // 댓글 수 조회 (특정 게시판의 게시물에 작성한 댓글)
      count = await prisma.comment.count({
        where: {
          authorId: userId,
          post: {
            categoryId: board.id,
            isHidden: false, // 숨김 게시물의 댓글 제외
          },
        },
      });
    }

    // 조건 만족 시 배지 추가
    if (count >= rule.condition.minCount) {
      earnedBadges.push(BADGE_INFO_MAP[rule.type]);
    }
  }

  return earnedBadges;
}

/**
 * 특정 사용자의 모든 배지를 계산합니다.
 * 
 * @param userId - 사용자 ID
 * @returns 획득한 배지 목록
 */
export async function getAllUserBadges(userId: string): Promise<BadgeInfo[]> {
  return getUserBadges(userId);
}

/**
 * 여러 사용자의 배지를 한 번에 계산합니다 (최적화용).
 * 
 * @param userIds - 사용자 ID 배열
 * @param boardSlug - 게시판 slug (선택적)
 * @returns 사용자 ID를 키로 하는 배지 맵
 */
export async function getUsersBadgesBatch(
  userIds: string[],
  boardSlug?: string
): Promise<BadgesMap> {
  const result: BadgesMap = {};
  
  // 중복 제거
  const uniqueUserIds = Array.from(new Set(userIds));
  
  // 각 사용자에 대해 배지 계산
  await Promise.all(
    uniqueUserIds.map(async (userId) => {
      result[userId] = await getUserBadges(userId, boardSlug);
    })
  );
  
  return result;
}

