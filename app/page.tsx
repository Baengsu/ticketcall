// app/page.tsx
import { loadLiveData } from "@/lib/aggregate";
import type { MergedData } from "@/lib/types";
import CalendarClient from "@/components/calendar-client";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export type EventItem = {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  openAt: string; // 예매 오픈 시간 (YYYY-MM-DDTHH:mm)
  viewCount?: number;
  detailUrl?: string;
};

export default async function Page() {
  // 🔥 크롤링 데이터 + 직접 추가 일정(DB) + 마지막 리빌드 시간 동시에 로드
  const [merged, etcEventsRaw, lastRebuildLog] = await Promise.all([
    loadLiveData(),
    prisma.etcEvent.findMany({
      orderBy: { datetime: "asc" },
    }),
    prisma.rebuildLog.findFirst({
      where: { status: "success" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 1) 크롤링 공연들 (merged-live.json 기반)
  const crawlerEvents = merged ? buildEvents(merged) : [];

  // 2) 관리자 직접 등록 공연들 (EtcEvent → EventItem)
  const etcEvents: EventItem[] = etcEventsRaw.map((e) => ({
  id: `etc-${e.id}`,
  siteId: "etc",
  siteName: "직접 추가",
  title: e.title,
  openAt: e.datetime.toISOString(), // 캘린더에서는 openAt 기준으로 사용
  viewCount: undefined,
  detailUrl: e.url ?? undefined,
}));

  // 3) 둘 다 합치기
  const events = [...crawlerEvents, ...etcEvents];

  // 마지막 리빌드 시간 문자열 (분 단위까지)
  const lastRebuildLabel = lastRebuildLog
    ? new Date(lastRebuildLog.createdAt).toLocaleString("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Asia/Seoul",
      })
    : null;

  // 아무 일정도 없을 때
  if (events.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">예매 오픈 일정이 없습니다.</h1>
          <p className="text-sm text-muted-foreground">
            각 사이트의 row에{" "}
            <code className="mx-1">title / openAt</code> 필드를 채워주거나,
            관리자 계정으로 직접 공연 일정을 등록해보세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-20 py-6 sm:py-8 md:py-10 lg:py-12 space-y-6 sm:space-y-8 w-full max-w-[1920px]">
        <header className="space-y-4 sm:space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-xl md:rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-xl">
              <span className="text-3xl sm:text-4xl md:text-5xl">🎫</span>
            </div>
            <div className="flex-1 space-y-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-transparent bg-clip-text">
                공연 예매 오픈 달력
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-2xl leading-relaxed">
                각 사이트에서 수집한 예매 오픈 시간과 직접 등록한 일정을 기준으로
                월간 스케줄을 한눈에 볼 수 있습니다.
              </p>
            </div>
          </div>
          {lastRebuildLabel && (
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-muted-foreground bg-muted/50 dark:bg-muted/30 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg md:rounded-xl border backdrop-blur-sm w-full sm:w-fit">
              <span className="text-base sm:text-lg">🔄</span>
              <span className="flex-1 sm:flex-initial">
                마지막 데이터 리빌드 기준 시각:{" "}
                <span className="font-semibold text-foreground">{lastRebuildLabel}</span>
              </span>
            </div>
          )}
        </header>

        <section className="w-full">
          <CalendarClient events={events} />
        </section>
      </div>
    </main>
  );
}

function buildEvents(merged: MergedData): EventItem[] {
  const events: EventItem[] = [];

  for (const site of merged.sites) {
    site.rows.forEach((row, index) => {
      const title = String(row.title ?? "").trim();
      const openAt = row.openAt as string | undefined;
      const viewCount =
        typeof row.viewCount === "number"
          ? (row.viewCount as number)
          : undefined;

      // 🔥 detailUrl (사이트마다 필드명이 다를 수 있으니 두 가지 다 체크)
      const detailUrl =
        typeof row.detailUrl === "string"
          ? (row.detailUrl as string)
          : typeof row.url === "string"
          ? (row.url as string)
          : undefined;

      if (!title || !openAt) return;

      events.push({
        id: `${site.id}-${index}`,
        siteId: site.id,
        siteName: site.name,
        title,
        openAt,
        viewCount,
        detailUrl, // 🔥 추가
      });
    });
  }

  events.sort((a, b) => a.openAt.localeCompare(b.openAt));
  return events;
}

