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
  // 🔥 크롤링 데이터 + 직접 추가 일정(DB) 동시에 로드
  const [merged, etcEventsRaw] = await Promise.all([
    loadLiveData(),
    prisma.etcEvent.findMany({
      orderBy: { datetime: "asc" },
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
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            공연 예매 오픈 달력
          </h1>
          <p className="text-sm text-muted-foreground">
            각 사이트에서 수집한 예매 오픈 시간과 직접 등록한 일정을 기준으로
            월간 스케줄을 한눈에 볼 수 있습니다.
          </p>
        </header>

        <section>
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

