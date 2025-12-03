// lib/inter.ts
import path from "path";
import fs from "fs/promises";
import type { SiteDataset } from "./types";
import { fetchJson } from "./baseCrawler";

const BASE = "https://tickets.interpark.com";
const API_URL = `${BASE}/contents/api/open-notice/notice-list`;

const DATA_DIR = path.join(process.cwd(), "data");
const INTER_DEBUG_PATH = path.join(DATA_DIR, "inter-debug.json");

// 인터파크 open-notice API 응답 타입 (우리가 쓰는 필드만 정의)
type InterNotice = {
  noticeId: number;
  title: string;
  openDateStr: string;       // "2025-12-03 20:00:00"
  isGeneralLater: boolean;
  venueName: string;
  goodsGenreStr: string;
  goodsRegionStr: string;
  posterImageUrl: string;
  openTypeStr: string;
  goodsSeatTypeStr: string;
  viewCount: number;
  goodsCode: string;
  displayDateStr: string;
  isHot: boolean;
  isToping: boolean;
};

// 날짜 문자열 → "YYYY-MM-DDTHH:mm"
function normalizeDateTime(raw: string | null | undefined): string {
  if (!raw) return "";
  // 예: "2025-12-03 20:00:00"
  const m = raw.match(
    /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!m) return "";
  const [, y, M, d, hh, mm] = m;
  return `${y}-${M}-${d}T${hh}:${mm}`;
}

// =========================
//  메인 크롤러
// =========================
export async function crawlInter(): Promise<SiteDataset> {
  const rows: any[] = [];

  // 한 번에 50개씩, 최대 3페이지(원하면 여기 늘려도 됨)
  const pageSize = 50;
  const maxPages = 3;

  let offset = 0;
  let pagesFetched = 0;

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      goodsGenre: "ALL",
      goodsRegion: "ALL",
      offset: String(offset),
      pageSize: String(pageSize),
      sorting: "OPEN_ASC",
    });

    const url = `${API_URL}?${params.toString()}`;
    console.log("[inter] fetch url:", url);

    let list: InterNotice[];
    try {
      list = await fetchJson<InterNotice[]>(url);
    } catch (err) {
      console.error("[inter] fetch 실패:", err);
      break;
    }

    console.log("[inter] 응답 개수:", Array.isArray(list) ? list.length : 0);
    if (!Array.isArray(list) || list.length === 0) {
      break;
    }

    for (const item of list) {
      // openDateStr 없는 안내용 공지는 달력에서 제외
      const openAt = normalizeDateTime(item.openDateStr);
      if (!openAt) continue;

      const showAt = normalizeDateTime(item.displayDateStr);

      rows.push({
        source: "interpark",
        noticeId: item.noticeId,
        goodsCode: item.goodsCode,
        title: (item.title ?? "").trim(),

        // 🔥 달력에서 쓰는 핵심 필드
        openAt,                  // ISO 형식 "YYYY-MM-DDTHH:mm"
        openAtLabel: item.openDateStr, // 원본 문자열
        viewCount: item.viewCount ?? 0,

        // 부가 정보들
        showAt,
        showAtLabel: item.displayDateStr,
        venueName: item.venueName,
        genre: item.goodsGenreStr,
        region: item.goodsRegionStr,
        openType: item.openTypeStr,
        seatType: item.goodsSeatTypeStr,
        posterImageUrl: item.posterImageUrl,
        isHot: item.isHot,
        isToping: item.isToping,

        // 예매 상세 페이지 (goodsCode 없으면 빈 문자열)
        detailUrl: item.goodsCode
          ? `${BASE}/goods/${item.goodsCode}`
          : "",

        // 디버그용
        apiOffset: offset,
      });
    }

    pagesFetched += 1;
    if (list.length < pageSize) {
      // 마지막 페이지 도달
      break;
    }

    offset += pageSize;
  }

  return {
    id: "inter",                // 기존 merged 데이터랑 맞추려고 "inter" 사용
    name: "인터파크 티켓오픈",
    rows,
    meta: {
      apiUrl: API_URL,
      count: rows.length,
      pagesFetched,
      pageSize,
    },
  };
}

// =========================
//  디버그용 JSON 저장
// =========================
export async function saveInterDebug(pathOverride?: string) {
  const snapshot = await crawlInter();

  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = pathOverride ?? INTER_DEBUG_PATH;
  await fs.writeFile(target, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(
    "[inter] 디버그 스냅샷 저장:",
    target,
    "rows:",
    snapshot.rows.length,
  );
  return target;
}
