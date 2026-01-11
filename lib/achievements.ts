/**
 * 성취 시스템 (Achievement System)
 * 
 * 성취는 사용자의 활동을 기반으로 계산되며, DB에 저장되지 않습니다.
 * 필요할 때마다 동적으로 계산되어 표시됩니다.
 */

import prisma from "@/lib/prisma";
import { getLevel } from "./level";

/**
 * 성취 타입 정의
 */
export type AchievementId =
  | "FIRST_POST"
  | "FIRST_COMMENT"
  | "100_POINTS"
  | "500_POINTS"
  | "1000_POINTS"
  | "LV5_REACHED"
  | "10_POSTS_IN_SUGGESTION"
  | "20_COMMENTS";

/**
 * 성취 정보
 */
export interface Achievement {
  id: AchievementId;
  name: string; // 표시될 이름
  description: string; // 설명
  icon: string; // 아이콘 (이모지)
  category: "activity" | "points" | "level" | "milestone"; // 카테고리
}

/**
 * 성취 정의 목록
 * 새로운 성취를 추가하려면 이 객체에 항목을 추가하고,
 * getUserAchievements 함수에 계산 로직을 추가하세요.
 */
export const ACHIEVEMENT_DEFINITIONS: Record<AchievementId, Achievement> = {
  FIRST_POST: {
    id: "FIRST_POST",
    name: "첫 게시물",
    description: "첫 번째 게시물을 작성했습니다.",
    icon: "🎯",
    category: "activity",
  },
  FIRST_COMMENT: {
    id: "FIRST_COMMENT",
    name: "첫 댓글",
    description: "첫 번째 댓글을 작성했습니다.",
    icon: "💬",
    category: "activity",
  },
  "100_POINTS": {
    id: "100_POINTS",
    name: "100 포인트 달성",
    description: "100 포인트를 획득했습니다.",
    icon: "⭐",
    category: "points",
  },
  "500_POINTS": {
    id: "500_POINTS",
    name: "500 포인트 달성",
    description: "500 포인트를 획득했습니다.",
    icon: "🌟",
    category: "points",
  },
  "1000_POINTS": {
    id: "1000_POINTS",
    name: "1000 포인트 달성",
    description: "1000 포인트를 획득했습니다.",
    icon: "💫",
    category: "points",
  },
  LV5_REACHED: {
    id: "LV5_REACHED",
    name: "레벨 5 달성",
    description: "레벨 5에 도달했습니다.",
    icon: "👑",
    category: "level",
  },
  "10_POSTS_IN_SUGGESTION": {
    id: "10_POSTS_IN_SUGGESTION",
    name: "건의사항 기여자",
    description: "건의사항 게시판에 10개의 게시물을 작성했습니다.",
    icon: "📝",
    category: "milestone",
  },
  "20_COMMENTS": {
    id: "20_COMMENTS",
    name: "댓글러",
    description: "20개의 댓글을 작성했습니다.",
    icon: "💭",
    category: "activity",
  },
};

/**
 * 특정 사용자의 성취 목록을 계산합니다.
 * 
 * @param userId - 사용자 ID
 * @returns 달성한 성취 목록
 */
export async function getUserAchievements(
  userId: string
): Promise<Achievement[]> {
  const achieved: Achievement[] = [];

  // 사용자 정보 조회
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      points: true,
    },
  });

  if (!user) {
    return [];
  }

  const points = (user as any).points ?? 0;
  const level = getLevel(points);

  // 게시물 및 댓글 개수 조회 (최적화)
  // 숨김 처리된 콘텐츠는 제외
  const [postCount, commentCount] = await Promise.all([
    prisma.post.count({
      where: { 
        authorId: userId,
        isHidden: false, // 숨김 처리된 게시물 제외
      },
    }),
    prisma.comment.count({
      where: { 
        authorId: userId,
        isHidden: false, // 숨김 처리된 댓글 제외
      },
    }),
  ]);

  // 게시물 작성 성취 체크
  if (postCount >= 1) {
    achieved.push(ACHIEVEMENT_DEFINITIONS.FIRST_POST);
  }

  // 댓글 작성 성취 체크
  if (commentCount >= 1) {
    achieved.push(ACHIEVEMENT_DEFINITIONS.FIRST_COMMENT);
  }

  // 포인트 기반 성취 체크
  if (points >= 100) {
    achieved.push(ACHIEVEMENT_DEFINITIONS["100_POINTS"]);
  }
  if (points >= 500) {
    achieved.push(ACHIEVEMENT_DEFINITIONS["500_POINTS"]);
  }
  if (points >= 1000) {
    achieved.push(ACHIEVEMENT_DEFINITIONS["1000_POINTS"]);
  }

  // 레벨 기반 성취 체크
  if (level >= 5) {
    achieved.push(ACHIEVEMENT_DEFINITIONS.LV5_REACHED);
  }

  // 댓글 개수 기반 성취 체크
  if (commentCount >= 20) {
    achieved.push(ACHIEVEMENT_DEFINITIONS["20_COMMENTS"]);
  }

  // 건의사항 게시판 게시물 개수 체크
  if (postCount > 0) {
    // 건의사항 게시판 ID 찾기
    const suggestionBoard = await prisma.boardCategory.findUnique({
      where: { slug: "free" }, // 건의사항 게시판 slug
      select: { id: true },
    });

    if (suggestionBoard) {
      const suggestionPostCount = await prisma.post.count({
        where: {
          authorId: userId,
          categoryId: suggestionBoard.id,
          isHidden: false, // 숨김 처리된 게시물 제외
        },
      });

      if (suggestionPostCount >= 10) {
        achieved.push(ACHIEVEMENT_DEFINITIONS["10_POSTS_IN_SUGGESTION"]);
      }
    }
  }

  return achieved;
}

/**
 * 성취를 카테고리별로 그룹화합니다.
 * 
 * @param achievements - 성취 목록
 * @returns 카테고리별로 그룹화된 성취
 */
export function groupAchievementsByCategory(
  achievements: Achievement[]
): Record<string, Achievement[]> {
  const grouped: Record<string, Achievement[]> = {
    activity: [],
    points: [],
    level: [],
    milestone: [],
  };

  for (const achievement of achievements) {
    grouped[achievement.category].push(achievement);
  }

  return grouped;
}

