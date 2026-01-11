// app/ranking/page.tsx
import { getAllTimeRanking, getCurrentSeasonRanking, getActiveSeason } from "@/lib/ranking";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLevel } from "@/lib/level";
import prisma from "@/lib/prisma";

export default async function RankingPage() {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;
  const currentUserId = currentUser?.id as string | undefined;

  // 현재 활성 시즌 조회
  const activeSeason = await getActiveSeason();
  
  // 랭킹 데이터 조회 (상위 100명)
  const [seasonRanking, allTimeRanking] = await Promise.all([
    activeSeason ? getCurrentSeasonRanking(100) : [],
    getAllTimeRanking(100),
  ]);

  // 현재 사용자의 순위 계산
  let currentUserSeasonRank: number | null = null;
  let currentUserAllTimeRank: number | null = null;
  let currentUserSeasonPoints: number = 0;
  let currentUserAllTimePoints: number = 0;

  if (currentUserId) {
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { points: true },
    });

    if (user) {
      currentUserAllTimePoints = user.points;
      
      // 전체 기간 순위 계산
      const usersAbove = await prisma.user.count({
        where: {
          points: { gt: user.points },
          isDisabled: false,
        },
      });
      currentUserAllTimeRank = usersAbove + 1;

      // 시즌 순위 계산
      if (activeSeason) {
        const seasonPointsResult = await prisma.pointHistory.aggregate({
          where: {
            userId: currentUserId,
            createdAt: {
              gte: activeSeason.startAt,
              lte: activeSeason.endAt,
            },
          },
          _sum: {
            amount: true,
          },
        });

        currentUserSeasonPoints = seasonPointsResult._sum.amount ?? 0;

        if (currentUserSeasonPoints > 0) {
          // 시즌 포인트가 있는 모든 사용자의 포인트 합계 조회
          const allSeasonPoints = await prisma.pointHistory.groupBy({
            by: ["userId"],
            where: {
              createdAt: {
                gte: activeSeason.startAt,
                lte: activeSeason.endAt,
              },
            },
            _sum: {
              amount: true,
            },
          });

          // 현재 사용자보다 높은 포인트를 가진 사용자 수 계산
          const usersAbove = allSeasonPoints.filter(
            (item) => (item._sum.amount ?? 0) > currentUserSeasonPoints
          ).length;

          currentUserSeasonRank = usersAbove + 1;
        }
      }
    }
  }

  const getDisplayName = (item: typeof seasonRanking[0]) => {
    return item.nickname ?? item.username ?? item.email ?? "익명";
  };

  return (
    <main className="max-w-5xl mx-auto py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">랭킹</h1>
        <p className="text-sm text-muted-foreground">
          사용자 포인트 기반 랭킹입니다. 현재 시즌 랭킹과 전체 기간 랭킹을 확인할 수 있습니다.
        </p>
      </header>

      {/* 현재 시즌 랭킹 */}
      {activeSeason && (
        <section className="border rounded-lg overflow-hidden">
          <div className="border-b px-4 py-3 bg-muted/60">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">현재 시즌 랭킹</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeSeason.name} ({new Date(activeSeason.startAt).toLocaleDateString("ko-KR")} ~ {new Date(activeSeason.endAt).toLocaleDateString("ko-KR")})
                </p>
              </div>
            </div>
          </div>

          {seasonRanking.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              시즌 랭킹 데이터가 없습니다.
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left w-16">순위</th>
                    <th className="px-4 py-2 text-left">사용자</th>
                    <th className="px-4 py-2 text-right w-24">포인트</th>
                    <th className="px-4 py-2 text-center w-20">레벨</th>
                  </tr>
                </thead>
                <tbody>
                  {seasonRanking.map((item) => {
                    const isCurrentUser = item.userId === currentUserId;
                    return (
                      <tr
                        key={item.userId}
                        className={`border-t ${
                          isCurrentUser ? "bg-blue-50 dark:bg-blue-950/20" : ""
                        }`}
                      >
                        <td className="px-4 py-2">
                          <span className="font-semibold">#{item.rank}</span>
                        </td>
                        <td className="px-4 py-2">
                          <span className={isCurrentUser ? "font-bold" : ""}>
                            {getDisplayName(item)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {item.points.toLocaleString()}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold">
                            Lv.{item.level}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 현재 사용자가 상위 100명에 없을 때 표시 */}
              {currentUserId &&
                currentUserSeasonRank !== null &&
                currentUserSeasonRank > 100 && (
                  <div className="border-t p-4 bg-blue-50 dark:bg-blue-950/20">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">
                        내 순위: #{currentUserSeasonRank}
                      </span>
                      <span className="text-muted-foreground">
                        포인트: {currentUserSeasonPoints.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
            </>
          )}
        </section>
      )}

      {/* 전체 기간 랭킹 */}
      <section className="border rounded-lg overflow-hidden">
        <div className="border-b px-4 py-3 bg-muted/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">전체 기간 랭킹</h2>
              <p className="text-xs text-muted-foreground mt-1">
                모든 기간 동안의 누적 포인트 기준
              </p>
            </div>
          </div>
        </div>

        {allTimeRanking.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            랭킹 데이터가 없습니다.
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left w-16">순위</th>
                  <th className="px-4 py-2 text-left">사용자</th>
                  <th className="px-4 py-2 text-right w-24">포인트</th>
                  <th className="px-4 py-2 text-center w-20">레벨</th>
                </tr>
              </thead>
              <tbody>
                {allTimeRanking.map((item) => {
                  const isCurrentUser = item.userId === currentUserId;
                  return (
                    <tr
                      key={item.userId}
                      className={`border-t ${
                        isCurrentUser ? "bg-blue-50 dark:bg-blue-950/20" : ""
                      }`}
                    >
                      <td className="px-4 py-2">
                        <span className="font-semibold">#{item.rank}</span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={isCurrentUser ? "font-bold" : ""}>
                          {getDisplayName(item)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {item.points.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-semibold">
                          Lv.{item.level}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* 현재 사용자가 상위 100명에 없을 때 표시 */}
            {currentUserId &&
              currentUserAllTimeRank !== null &&
              currentUserAllTimeRank > 100 && (
                <div className="border-t p-4 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      내 순위: #{currentUserAllTimeRank}
                    </span>
                    <span className="text-muted-foreground">
                      포인트: {currentUserAllTimePoints.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
          </>
        )}
      </section>
    </main>
  );
}

