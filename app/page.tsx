// app/page.tsx
import { loadLiveData } from "@/lib/aggregate";
import type { MergedData } from "@/lib/types";
import CalendarClient from "@/components/calendar-client";

export const dynamic = "force-dynamic";

export type EventItem = {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  openAt: string; // 예매 오픈 시간 (YYYY-MM-DDTHH:mm)
  viewCount?: number;
};

export default async function Page() {
  const merged = await loadLiveData();

  if (!merged) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">
          아직 저장된 데이터가 없습니다. 먼저 크롤링을 실행해서
          <code className="mx-1">merged-live.json</code>을 생성해 주세요.
        </p>
      </main>
    );
  }

  const events = buildEvents(merged);

  if (events.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-semibold">예매 오픈 일정이 없습니다.</h1>
          <p className="text-sm text-muted-foreground">
            각 사이트의 row에{" "}
            <code className="mx-1">title / openAt</code> 필드를 채워주면 달력에
            표시됩니다.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-10 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">공연 예매 오픈 달력</h1>
          <p className="text-sm text-muted-foreground">
            각 사이트에서 수집한 예매 오픈 시간을 기준으로 월간 스케줄을 한눈에
            볼 수 있습니다.
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

      if (!title || !openAt) return;

      events.push({
        id: `${site.id}-${index}`,
        siteId: site.id,
        siteName: site.name,
        title,
        openAt,
        viewCount,
      });
    });
  }

  events.sort((a, b) => a.openAt.localeCompare(b.openAt));
  return events;
}
