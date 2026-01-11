/**
 * 랭킹 시스템 유틸리티
 * 
 * 사용자 포인트 기반 랭킹 시스템
 * - 전체 기간 랭킹: User.points를 직접 사용 (누적 포인트)
 * - 시즌 랭킹: PointHistory에서 시즌 기간 내 포인트 합산
 * 
 * 중요: User.points는 리셋되지 않으며, 전체 누적 포인트를 유지합니다.
 * 시즌 랭킹은 PointHistory를 기반으로 동적으로 계산됩니다.
 */

import prisma from "@/lib/prisma";
import { getLevel } from "./level";

/**
 * 랭킹 타입 정의
 * 향후 Weekly, Monthly ranking을 지원할 수 있도록 확장 가능한 구조
 */
export type RankingType = "alltime" | "weekly" | "monthly";

/**
 * 랭킹 항목 타입
 */
export type RankingItem = {
  rank: number; // 순위 (1부터 시작)
  userId: string;
  nickname: string | null;
  username: string | null;
  email: string | null;
  points: number;
  level: number;
};

/**
 * 전체 기간 랭킹 조회
 * User.points를 기준으로 내림차순 정렬
 * 
 * @param limit - 조회할 사용자 수 (선택적, 기본값: 전체)
 * @returns 랭킹 항목 배열
 * 
 * @example
 * const ranking = await getAllTimeRanking(100);
 * // [{ rank: 1, userId: "...", nickname: "...", points: 1000, level: 5 }, ...]
 */
export async function getAllTimeRanking(
  limit?: number
): Promise<RankingItem[]> {
  const users = await prisma.user.findMany({
    where: {
      // 정지된 계정은 제외 (선택사항)
      isDisabled: false,
    },
    select: {
      id: true,
      nickname: true,
      username: true,
      email: true,
      points: true,
    },
    orderBy: [
      { points: "desc" },
      { id: "asc" }, // 동일한 포인트를 가진 사용자들은 ID 순서로 정렬 (일관된 순서 보장)
    ],
    ...(limit ? { take: limit } : {}),
  });

  // 랭킹 순위 추가 및 레벨 계산
  return users.map((user, index) => ({
    rank: index + 1,
    userId: user.id,
    nickname: user.nickname,
    username: user.username,
    email: user.email,
    points: user.points,
    level: getLevel(user.points),
  }));
}

/**
 * Top N 사용자 조회
 * 전체 기간 랭킹에서 상위 N명 조회
 * 
 * @param topN - 조회할 상위 사용자 수 (기본값: 10)
 * @returns 랭킹 항목 배열
 * 
 * @example
 * const top10 = await getTopUsers(10);
 * // 상위 10명 반환
 * 
 * @example
 * const top5 = await getTopUsers(5);
 * // 상위 5명 반환
 */
export async function getTopUsers(topN: number = 10): Promise<RankingItem[]> {
  if (topN <= 0) {
    return [];
  }

  return getAllTimeRanking(topN);
}

/**
 * 특정 사용자의 전체 기간 랭킹 순위 조회
 * 
 * @param userId - 사용자 ID
 * @returns 사용자의 순위 (없으면 null)
 * 
 * @example
 * const rank = await getUserRank("user-id");
 * // 15 (15위)
 */
export async function getUserRank(userId: string): Promise<number | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { points: true },
  });

  if (!user) {
    return null;
  }

  // 더 높은 포인트를 가진 사용자 수를 계산하여 순위 결정
  const usersAbove = await prisma.user.count({
    where: {
      points: {
        gt: user.points,
      },
      isDisabled: false,
    },
  });

  return usersAbove + 1;
}

/**
 * 랭킹 타입별 조회 함수 (향후 확장용)
 * 현재는 alltime만 지원
 * 
 * @param type - 랭킹 타입
 * @param limit - 조회할 사용자 수 (선택적)
 * @returns 랭킹 항목 배열
 * 
 * @example
 * const ranking = await getRanking("alltime", 100);
 * // 향후 getRanking("weekly", 100) 또는 getRanking("monthly", 100) 지원 예정
 */
export async function getRanking(
  type: RankingType,
  limit?: number
): Promise<RankingItem[]> {
  switch (type) {
    case "alltime":
      return getAllTimeRanking(limit);
    case "weekly":
      // TODO: 주간 랭킹 구현 (PointHistory 기반)
      throw new Error("Weekly ranking is not yet implemented");
    case "monthly":
      // TODO: 월간 랭킹 구현 (PointHistory 기반)
      throw new Error("Monthly ranking is not yet implemented");
    default:
      throw new Error(`Unknown ranking type: ${type}`);
  }
}

/**
 * 현재 활성 시즌 조회
 * @returns 활성 시즌 (없으면 null)
 */
export async function getActiveSeason() {
  return await prisma.season.findFirst({
    where: { isActive: true },
    orderBy: { startAt: "desc" },
  });
}

/**
 * 시즌별 랭킹 계산
 * PointHistory에서 시즌 기간(startAt ~ endAt) 내의 포인트를 합산합니다.
 * 
 * @param seasonId - 시즌 ID
 * @param limit - 조회할 사용자 수 (선택적)
 * @returns 랭킹 항목 배열
 */
export async function getSeasonRanking(
  seasonId: number,
  limit?: number
): Promise<RankingItem[]> {
  // 시즌 정보 조회
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { startAt: true, endAt: true },
  });

  if (!season) {
    return [];
  }

  // PointHistory에서 시즌 기간 내 포인트 합산
  // groupBy는 orderBy를 지원하지 않으므로, 모든 데이터를 가져온 후 정렬
  const pointSums = await prisma.pointHistory.groupBy({
    by: ["userId"],
    where: {
      createdAt: {
        gte: season.startAt,
        lte: season.endAt,
      },
    },
    _sum: {
      amount: true,
    },
  });

  // 포인트 합계로 정렬 (내림차순)
  pointSums.sort((a, b) => {
    const sumA = a._sum.amount ?? 0;
    const sumB = b._sum.amount ?? 0;
    return sumB - sumA;
  });

  // limit 적용
  const limitedSums = limit ? pointSums.slice(0, limit) : pointSums;

  // userId 배열 추출
  const userIds = limitedSums.map((item) => item.userId);

  if (userIds.length === 0) {
    return [];
  }

  // 사용자 정보 조회
  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      isDisabled: false,
    },
    select: {
      id: true,
      nickname: true,
      username: true,
      email: true,
    },
  });

  // 사용자 정보를 맵으로 변환
  const userMap = new Map(
    users.map((user) => [user.id, user])
  );

  // 랭킹 항목 생성 (순위 계산 포함)
  const ranking: RankingItem[] = [];
  let currentRank = 1;
  let previousPoints: number | null = null;

  for (const item of limitedSums) {
    const user = userMap.get(item.userId);
    if (!user) continue;

    const seasonPoints = item._sum.amount ?? 0;

    // 동일한 포인트는 같은 순위, 다른 포인트는 다음 순위
    if (previousPoints !== null && seasonPoints < previousPoints) {
      currentRank = ranking.length + 1;
    }
    previousPoints = seasonPoints;

    ranking.push({
      rank: currentRank,
      userId: user.id,
      nickname: user.nickname,
      username: user.username,
      email: user.email,
      points: seasonPoints,
      level: getLevel(seasonPoints),
    });
  }

  return ranking;
}

/**
 * 현재 활성 시즌 랭킹 조회
 * @param limit - 조회할 사용자 수 (선택적)
 * @returns 랭킹 항목 배열 (활성 시즌이 없으면 빈 배열)
 */
export async function getCurrentSeasonRanking(
  limit?: number
): Promise<RankingItem[]> {
  const activeSeason = await getActiveSeason();
  if (!activeSeason) {
    return [];
  }

  return getSeasonRanking(activeSeason.id, limit);
}

