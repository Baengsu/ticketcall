// C:\ticketcall\lib\events.ts
// lib/events.ts

import mergedJson from "@/data/merged-live.json";
import type {
  MergedData,
  SiteId,
  OpenEvent,
  OpenEventId,
} from "./types";

// 내부 캐시 (서버에서 여러 번 불릴 때 성능용)
let cachedEvents: OpenEvent[] | null = null;

// merged-live.json을 가능한 여러 형태에 대응해서 OpenEvent[]로 변환
function buildAllEvents(): OpenEvent[] {
  const events: OpenEvent[] = [];

  const data: any = mergedJson as any;

  // 1) 우리가 설계한 MergedData 형태: { generatedAt, sites: [...] }
  if (data && Array.isArray(data.sites)) {
    const merged = data as MergedData;

    for (const site of merged.sites) {
      const siteId = site.id as SiteId;
      const siteName = site.name;

      for (const row of site.rows) {
        const id =
          (row.id as string | number | undefined)?.toString() ??
          (row.ID as string | number | undefined)?.toString() ??
          "";

        if (!id) continue;

        const title =
          (row.title as string | undefined) ??
          (row.TITLE as string | undefined) ??
          (row.name as string | undefined) ??
          "제목 없음";

        const category =
          (row.category as string | undefined) ??
          (row.CATEGORY as string | undefined);

        const openAt =
          (row.openAt as string | undefined) ??
          (row.open_at as string | undefined);

        const showAt =
          (row.showAt as string | undefined) ??
          (row.show_at as string | undefined);

        const openAtLabel =
          (row.openAtLabel as string | undefined) ??
          (row.open_at_label as string | undefined);

        const detailUrl =
          (row.detailUrl as string | undefined) ??
          (row.url as string | undefined);

        const viewCount =
          (row.viewCount as number | undefined) ??
          (row.views as number | undefined);

        events.push({
          siteId,
          siteName,
          id,
          title,
          category,
          openAt,
          showAt,
          openAtLabel,
          detailUrl,
          viewCount,
          raw: row,
        });
      }
    }

    return events;
  }

  // 2) 혹시 그냥 배열로만 되어있는 경우: [ { source, id, title, ... }, ... ]
  if (Array.isArray(data)) {
    for (const row of data) {
      const source: string | undefined = row.source;
      const siteId = (source?.startsWith("yes") ? "yes" : "etc") as SiteId;
      const siteName =
        (source as string | undefined) ?? "알 수 없는 사이트";

      const id =
        (row.id as string | number | undefined)?.toString() ??
        "";

      if (!id) continue;

      const title =
        (row.title as string | undefined) ??
        (row.TITLE as string | undefined) ??
        "제목 없음";

      const category = row.category as string | undefined;
      const openAt = row.openAt as string | undefined;
      const showAt = row.showAt as string | undefined;
      const openAtLabel = row.openAtLabel as string | undefined;
      const detailUrl = row.detailUrl as string | undefined;
      const viewCount = row.viewCount as number | undefined;

      events.push({
        siteId,
        siteName,
        id,
        title,
        category,
        openAt,
        showAt,
        openAtLabel,
        detailUrl,
        viewCount,
        raw: row,
      });
    }

    return events;
  }

  // 3) { rows: [...] } 한 덩어리만 있는 경우
  if (data && Array.isArray(data.rows)) {
    const siteId = "etc" as SiteId;
    const siteName = "공연 리스트";

    for (const row of data.rows) {
      const id =
        (row.id as string | number | undefined)?.toString() ??
        "";

      if (!id) continue;

      const title =
        (row.title as string | undefined) ??
        (row.TITLE as string | undefined) ??
        "제목 없음";

      const category = row.category as string | undefined;
      const openAt = row.openAt as string | undefined;
      const showAt = row.showAt as string | undefined;
      const openAtLabel = row.openAtLabel as string | undefined;
      const detailUrl = row.detailUrl as string | undefined;
      const viewCount = row.viewCount as number | undefined;

      events.push({
        siteId,
        siteName,
        id,
        title,
        category,
        openAt,
        showAt,
        openAtLabel,
        detailUrl,
        viewCount,
        raw: row,
      });
    }

    return events;
  }

  // 위 아무 경우도 아니면 빈 배열
  return events;
}

export function getAllEvents(): OpenEvent[] {
  if (!cachedEvents) {
    cachedEvents = buildAllEvents();
  }
  return cachedEvents;
}

// ID 문자열: `${siteId}:${rowId}` 형태
export function makeEventId(siteId: SiteId, rowId: string | number): OpenEventId {
  return `${siteId}:${rowId}`;
}

export function parseEventId(
  eventId: OpenEventId
): { siteId: string | null; rowId: string | null } {
  const parts = eventId.split(":");
  if (parts.length !== 2) return { siteId: null, rowId: null };
  const [siteStr, rowId] = parts;
  return {
    siteId: siteStr || null,
    rowId: rowId || null,
  };
}

// 🔥 ID로 단일 이벤트 찾기
export function getEventById(eventId: OpenEventId): OpenEvent | null {
  const { siteId, rowId } = parseEventId(eventId);
  const events = getAllEvents();

  // 1차: siteId + rowId 모두 일치하는 이벤트를 우선 시도
  if (siteId && rowId) {
    const exact = events.find(
      (e) =>
        e.siteId.toString() === siteId.toString() &&
        e.id.toString() === rowId.toString()
    );
    if (exact) return exact;
  }

  // 2차: siteId가 안 맞더라도 id만 일치하는 이벤트를 검색
  if (rowId) {
    const byId = events.find(
      (e) => e.id.toString() === rowId.toString()
    );
    if (byId) return byId;
  }

  // 아무것도 못 찾으면 null
  return null;
}
