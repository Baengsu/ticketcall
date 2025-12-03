// lib/yes.ts
import fs from "fs/promises";
import path from "path";
import type { SiteDataset } from "./types";
import { fetchHtmlPost } from "./baseCrawler";

const BASE = "https://ticket.yes24.com";
const DATA_DIR = path.join(process.cwd(), "data");
const YES_DEBUG_PATH = path.join(DATA_DIR, "yes-debug.json");

// =======================
//  YES24 티켓 공지사항 크롤러 (axList POST)
// =======================
export async function crawlYes(): Promise<SiteDataset> {
  const rows: Array<Record<string, any>> = [];
  const seen = new Set<string>();

  const maxPages = 5; // 1~5 페이지만 (원하면 10으로 늘려도 됨)
  let pagesFetched = 0;

  try {
    for (let page = 1; page <= maxPages; page++) {
      const form = new URLSearchParams({
        page: String(page),
        size: "20",
        genre: "",
        province: "",
        order: "",
        searchType: "All",
        searchText: "",
      });

      const url = `${BASE}/New/Notice/Ajax/axList.aspx`;
      console.log("[yes] fetch POST:", url, "page=", page);

      const { html, $ } = await fetchHtmlPost(url, form.toString());
      console.log("[yes] html length:", html.length);

      if (!$ || typeof $ !== "function") {
        console.error("[yes] fetchHtmlPost 결과에 $ 가 없음, 중단");
        break;
      }

      const added = collectPageRows($, rows, seen, page);
      console.log(`[yes] page ${page} 에서 파싱된 row 수:`, added);

      if (added === 0) {
        break;
      }

      pagesFetched = page;
    }
  } catch (err) {
    console.error("[yes] crawlYes 실패:", err);
    // 여기서는 throw 안 함. aggregate 쪽에서 전체가 죽지 않도록.
  }

  return {
    id: "yes",
    name: "YES24 티켓오픈",
    rows,
    meta: {
      url: `${BASE}/New/Notice/NoticeMain.aspx?Gcode=009_208_002`,
      count: rows.length,
      pagesFetched,
      sort: "등록순(기본)", // 서버 기준 기본 정렬
    },
  };
}

// =======================
//  한 페이지 테이블 파싱
// =======================
function collectPageRows(
  $: any,
  rows: Array<Record<string, any>>,
  seen: Set<string>,
  page: number,
): number {
  let added = 0;

  const $table = $(".noti-tbl table").first();
  if (!$table || $table.length === 0) {
    console.log("[yes] collectPageRows: .noti-tbl table 을 찾지 못함");
    return 0;
  }

  const $trs = $table.find("tbody > tr");
  console.log("[yes] .noti-tbl tbody tr 개수:", $trs.length);

  $trs.each((_idx: number, tr: any) => {
    const $tr = $(tr);

    // 헤더 행(TH 포함)은 스킵
    if ($tr.find("th").length > 0) return;

    const $tds = $tr.find("td");
    if ($tds.length < 4) return;

    const category = $tds.eq(0).text().trim();

    const $link = $tds.eq(1).find("a").first();
    if (!$link || !$link.length) return;

    const rawTitle = $link.text();
    const title = cleanTitle(rawTitle);

    const href = String($link.attr("href") || "");

    const openAtLabel = $tds.eq(2).text().replace(/\s+/g, " ").trim();
    const viewText = $tds.eq(3).text().replace(/,/g, "").trim();
    const viewCount = viewText ? Number(viewText) || 0 : 0;

    // href 는 "#id=16995" 형태
    let id = "";
    const m = href.match(/id=(\d+)/);
    if (m) id = m[1];

    // dedup key: 공지 id가 있으면 id 기준, 없으면 (제목+오픈일시) 조합
    const dedupKey = id || `${title}__${openAtLabel}`;
    if (seen.has(dedupKey)) return;
    seen.add(dedupKey);

    const openAt = normalizeYesDate(openAtLabel);
    const showAt = openAt;

    rows.push({
      source: "yes24",
      id,
      category,
      title,
      openAt,        // "YYYY-MM-DDTHH:mm"
      showAt,        // 지금은 openAt과 동일
      openAtLabel,   // "2025.12.04(목) 10:00"
      viewCount,
      detailUrl: id
        ? `${BASE}/New/Notice/NoticeMain.aspx?#id=${id}`
        : "",
      page,          // 몇 페이지에서 가져왔는지 기록
    });

    added += 1;
  });

  return added;
}

// 제목 정리: 공백 압축 + [단독판매] 같은 태그 제거 등
function cleanTitle(t: string): string {
  if (!t) return "";
  let s = t;
  s = s.replace(/\s+/g, " ");        // 여러 공백 → 한 칸
  s = s.replace(/\[단독판매\]/g, ""); // 필요시 다른 태그도 여기서 제거
  return s.trim();
}

// "2025.12.04(목) 10:00" -> "2025-12-04T10:00"
function normalizeYesDate(label: string): string {
  if (!label) return "";
  const m = label.match(/(\d{4})\.(\d{2})\.(\d{2}).*?(\d{2}):(\d{2})/);
  if (!m) return "";
  const [, y, M, d, hh, mm] = m;
  return `${y}-${M}-${d}T${hh}:${mm}`;
}

// =======================
//  디버그용: YES24만 JSON으로 저장
// =======================
export async function saveYesDebug(pathOverride?: string) {
  const snapshot = await crawlYes();

  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = pathOverride ?? YES_DEBUG_PATH;

  await fs.writeFile(target, JSON.stringify(snapshot, null, 2), "utf-8");

  console.log(
    "[yes] 디버그 스냅샷 저장:",
    target,
    "rows:",
    snapshot.rows.length,
  );
  return target;
}
