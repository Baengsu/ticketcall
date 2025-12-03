// lib/melon.ts
import path from "path";
import fs from "fs/promises";
import * as cheerio from "cheerio";
import type { SiteDataset } from "./types";

const BASE = "https://ticket.melon.com";
const LIST_URL = `${BASE}/csoon/ajax/listTicketOpen.htm`;

const DATA_DIR = path.join(process.cwd(), "data");
const MELON_DEBUG_PATH = path.join(DATA_DIR, "melon-debug.json");

// "2025.12.03(수) 18:00" → "2025-12-03T18:00"
function normalizeOpenDate(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = raw.match(/(\d{4})\.(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/);
  if (!m) return "";
  const [, y, M, d, hh, mm] = m;
  return `${y}-${M}-${d}T${hh}:${mm}`;
}

// "2025.11.28" → "2025-11-28"
function normalizeDateOnly(raw: string | null | undefined): string {
  if (!raw) return "";
  const m = raw.match(/(\d{4})\.(\d{2})\.(\d{2})/);
  if (!m) return "";
  const [, y, M, d] = m;
  return `${y}-${M}-${d}`;
}

// 멜론 티켓오픈 리스트 한 페이지 가져오기 (AJAX 엔드포인트 그대로 사용)
async function fetchMelonPage(pageIndex: string) {
  const params = new URLSearchParams({
    orderType: "2",        // 오픈일순
    pageIndex,             // "1", "11", ...
    schGcode: "GENRE_ALL", // 전체
    schText: "",
  });

  const res = await fetch(LIST_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "User-Agent":
        "Mozilla/5.0 (compatible; TicketOpenBot/1.0; +https://ticket.melon.com)",
      Referer: `${BASE}/csoon/index.htm`,
    },
    body: params.toString(),
  });

  if (!res.ok) {
    throw new Error(
      `[melon] listTicketOpen 응답 오류: ${res.status} ${res.statusText}`,
    );
  }

  const html = await res.text();
  // cheerio.load(...)의 타입이 Root 라서, 그대로 Root로 사용
  return cheerio.load(html);
}

// ⬇️ 여기 타입만 Root 로 수정!
function parseMelonList($: cheerio.Root, pageIndex: string) {
  const rows: any[] = [];

  $("ul.list_ticket_cont > li").each((_, el) => {
    const li = $(el);

    const openLabel = li.find(".ticket_data .date").text().trim();
    const openAt = normalizeOpenDate(openLabel);
    if (!openAt) {
      // 오픈일이 이상하면 스킵
      return;
    }

    const title = li
      .find(".link_consert a.tit")
      .text()
      .replace(/\s+/g, " ")
      .trim();

    const viewText = li
      .find(".register_info .txt_review")
      .text()
      .replace(/[^\d]/g, "");
    const viewCount = viewText ? parseInt(viewText, 10) : 0;

    const regLabel = li.find(".register_info .txt_date").text().trim();
    const registeredAt = normalizeDateOnly(regLabel);

    const saleType = li.find(".point span").text().trim(); // "단독판매" 등

    const hrefTarget =
      li.find(".link_consert a.tit").attr("href") ||
      li.find("a.poster").attr("href") ||
      "";
    const detailUrl = hrefTarget
      ? new URL(hrefTarget, `${BASE}/csoon/`).toString()
      : "";

    const posterImageUrl = li.find("a.poster img").attr("src") ?? "";

    rows.push({
      source: "melon",
      title,
      openAt, // ISO: "YYYY-MM-DDTHH:mm"
      openAtLabel: openLabel,
      viewCount,

      // 부가 정보
      registeredAt,
      registeredAtLabel: regLabel,
      saleType,
      detailUrl,
      posterImageUrl,

      // 어디서 가져온 건지 추적용
      pageIndex,
    });
  });

  return rows;
}

// =========================
//  메인 크롤러
// =========================
export async function crawlMelon(): Promise<SiteDataset> {
  const allRows: any[] = [];

  // 멜론은 pageIndex 1, 11, 21, 31 ... 이런 식으로 넘어감
  // 👉 1페이지, 2페이지까지만 크롤링
  const pageIndexes = ["1", "11"];

  for (const idx of pageIndexes) {
    try {
      console.log("[melon] 페이지 크롤링:", idx);
      const $ = await fetchMelonPage(idx);
      const rows = parseMelonList($, idx);
      console.log("[melon] 파싱된 행 수:", idx, rows.length);
      allRows.push(...rows);
    } catch (err) {
      console.error("[melon] fetch/parse 실패:", idx, err);
    }
  }

  return {
    id: "melon",
    name: "멜론티켓 티켓오픈",
    rows: allRows,
    meta: {
      baseUrl: BASE,
      listUrl: LIST_URL,
      pages: pageIndexes,
      count: allRows.length,
    },
  };
}

// =========================
//  디버그용: 전체 스냅샷 저장
// =========================
export async function saveMelonDebug(pathOverride?: string) {
  const snapshot = await crawlMelon();

  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = pathOverride ?? MELON_DEBUG_PATH;
  await fs.writeFile(target, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(
    "[melon] 디버그 스냅샷 저장:",
    target,
    "rows:",
    snapshot.rows.length,
  );

  return target;
}
