// lib/link.ts
import type { SiteDataset } from "./types";
import { fetchJson } from "./baseCrawler";

const BASE = "https://www.ticketlink.co.kr";

// ---- 티켓링크 응답 타입 정의 ----

interface TicketlinkNotice {
  noticeId: number;
  noticeCategoryCode: string;
  noticeCategoryName: string;
  title: string;
  ticketOpenDatetime?: string;  // 예매 오픈 시간 (원본)
  registerDatetime: string;     // 공지 등록 시간 (원본)
  viewCount: number;            // 조회수
}

interface TicketlinkPaging {
  page: number;
  totalPage: number;
}

interface TicketlinkResponse {
  result: {
    result: TicketlinkNotice[];
    paging: TicketlinkPaging;
  };
}

// ---- 크롤러 본체 ----

export async function crawlLink(): Promise<SiteDataset> {
  const rows: Array<Record<string, any>> = [];
  const seen = new Set<number>(); // noticeId 기준 중복 제거

  let page = 1;
  const maxPages = 5; // 1~5페이지까지 긁기

  while (page <= maxPages) {
    const url =
      `${BASE}/help/getNoticeList` +
      `?page=${page}` +
      `&noticeCategoryCode=TICKET_OPEN` + // 티켓오픈 탭
      `&title=` +                         // 검색어 없음
      `&sortCode=OPEN_DATE`;             // 오픈예정순

    const json = await fetchJson<TicketlinkResponse>(url);

    const notices = json.result.result;
    const paging = json.result.paging;

    if (!notices || notices.length === 0) break;

    for (const n of notices) {
      if (seen.has(n.noticeId)) continue; // 중복 공지 스킵
      seen.add(n.noticeId);

      const cleanTitle = stripTags(n.title);

      // 티켓오픈 공지면 ticketOpenDatetime, 아니면 registerDatetime 사용
      const baseRaw = n.ticketOpenDatetime ?? n.registerDatetime;
      const { localIso, display } = normalizeTicketlinkDate(baseRaw);

      const openAt = localIso;
      const showAt = localIso; // 지금은 오픈 기준으로만 사용 (미래 확장용으로 남겨둠)

      rows.push({
        source: "ticketlink",
        noticeId: n.noticeId,
        categoryCode: n.noticeCategoryCode,
        categoryName: n.noticeCategoryName,
        title: cleanTitle,

        // 공통 스키마 필드
        openAt,              // 예매 오픈 시간 (YYYY-MM-DDTHH:mm)
        showAt,              // 현재는 openAt과 동일하게 사용
        openAtLabel: display, // "2025.12.03(수) 15:00" 같은 표시용 라벨

        registerAt: normalizeTicketlinkDate(n.registerDatetime).localIso,
        viewCount: n.viewCount,
        detailUrl: `${BASE}/help/notice/${n.noticeId}`,
      });
    }

    if (page >= paging.totalPage) break;
    page += 1;
  }

  return {
    id: "link",
    name: "티켓링크 티켓오픈",
    rows,
    meta: {
      url: `${BASE}/help/notice#TICKET_OPEN`,
      count: rows.length,
      pagesFetched: page - 1,
      sort: "OPEN_DATE",
    },
  };
}

// ---- 날짜 문자열을 KST 기준으로 정규화 ----

function normalizeTicketlinkDate(raw?: string): {
  localIso: string;   // "YYYY-MM-DDTHH:mm"
  display: string;    // "YYYY.MM.DD(수) HH:mm"
} {
  if (!raw) {
    return { localIso: "", display: "" };
  }

  const d = new Date(raw);

  if (Number.isNaN(d.getTime())) {
    // 예상 못한 형식이면 그냥 원본을 그대로 남겨둔다
    return { localIso: raw, display: raw };
  }

  // 로컬 시간대 기준 (한국에서 서버 돌리면 KST 기준)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");

  const localIso = `${y}-${m}-${day}T${hh}:${mi}`; // Z 안 붙임

  const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = weekdayNames[d.getDay()] ?? "";

  const display = `${y}.${m}.${day}(${dow}) ${hh}:${mi}`;

  return { localIso, display };
}

// ---- HTML 태그 제거 (e.g. <b>...</b>) ----

function stripTags(input: string): string {
  if (!input) return "";
  // 모든 HTML 태그 제거
  return input.replace(/<[^>]*>/g, "").trim();
}
