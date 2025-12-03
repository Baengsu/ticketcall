// lib/aggregate.ts
import path from "path";
import fs from "fs/promises";

import type { MergedData, SiteDataset } from "./types";
import { crawlMelon } from "./melon";
import { crawlInter } from "./inter";
import { crawlYes } from "./yes";
import { crawlLink } from "./link";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_PATH = path.join(DATA_DIR, "merged-backup.json");
const LIVE_PATH = path.join(DATA_DIR, "merged-live.json");

// 1) 4개 사이트 크롤링 + 이전 스냅샷과 병합
export async function buildMergedData(): Promise<MergedData> {
  // 새로 크롤링한 데이터
  const [melon, inter, yes, link] = await Promise.all([
    crawlMelon(),
    crawlInter(),
    crawlYes(),
    crawlLink(),
  ]);

  const fresh: MergedData = {
    generatedAt: new Date().toISOString(),
    sites: [melon, inter, yes, link],
  };

  // 기존 live 데이터 불러오기 (없으면 null)
  const prev = await loadLiveData();

  // 이전 스냅샷과 병합
  return mergeSnapshots(prev, fresh);
}

// 2) backup + live 둘 다 저장
export async function saveMergedData(snapshot: MergedData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const json = JSON.stringify(snapshot, null, 2);

  await fs.writeFile(BACKUP_PATH, json, "utf-8");
  await fs.writeFile(LIVE_PATH, json, "utf-8");
}

// 3) 라이브본 읽기 (페이지에서 사용)
export async function loadLiveData(): Promise<MergedData | null> {
  try {
    const json = await fs.readFile(LIVE_PATH, "utf-8");
    return JSON.parse(json) as MergedData;
  } catch {
    return null;
  }
}

// 4) 백업본 읽기 (복구용)
export async function loadBackupData(): Promise<MergedData | null> {
  try {
    const json = await fs.readFile(BACKUP_PATH, "utf-8");
    return JSON.parse(json) as MergedData;
  } catch {
    return null;
  }
}

// 5) live만 덮어쓰기 (관리자 수정 후 저장용)
export async function saveLiveDataOnly(snapshot: MergedData) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const json = JSON.stringify(snapshot, null, 2);
  await fs.writeFile(LIVE_PATH, json, "utf-8");
}

/* ------------------------------------------------------------------
   병합 로직
   - prev: 이전에 저장되어 있던 merged-live.json (없으면 null)
   - fresh: 이번에 새로 크롤링한 스냅샷
-------------------------------------------------------------------*/

function mergeSnapshots(
  prev: MergedData | null,
  fresh: MergedData
): MergedData {
  if (!prev) {
    // 첫 실행이거나 이전 데이터가 없으면 그대로 사용
    return fresh;
  }

  // 사이트 id 기준으로 매칭
  const prevById = new Map<string, SiteDataset>(
    prev.sites.map((s) => [s.id, s] as const)
  );

  const mergedSites: SiteDataset[] = [];

  for (const freshSite of fresh.sites) {
    const prevSite = prevById.get(freshSite.id);
    mergedSites.push(mergeSite(prevSite, freshSite));
    prevById.delete(freshSite.id);
  }

  // fresh에는 없고 prev에만 있던 사이트(id)는 그대로 유지
  for (const leftoverSite of prevById.values()) {
    mergedSites.push(leftoverSite);
  }

  return {
    ...fresh,
    sites: mergedSites,
  };
}

/**
 * 같은 사이트(id) 안에서의 병합 규칙:
 * - 기준: title(문자열)이 같은 row
 * - 제목이 같으면: 예전 row는 유지, fresh의 viewCount만 덮어씀
 * - fresh에만 있는 제목은 새로 push
 * - fresh에 안 보이는 예전 row는 그대로 남겨둠
 */
function mergeSite(
  prevSite: SiteDataset | undefined,
  freshSite: SiteDataset
): SiteDataset {
  if (!prevSite) {
    // 이전에 이 사이트가 아예 없었던 경우: 새 데이터 그대로 사용
    return freshSite;
  }

  const mergedRows: any[] = [...prevSite.rows];

  // 제목 -> 기존 인덱스 맵
  const indexByTitle = new Map<string, number>();
  mergedRows.forEach((row, idx) => {
    const t =
      typeof row.title === "string"
        ? row.title.trim()
        : "";
    if (t && !indexByTitle.has(t)) {
      indexByTitle.set(t, idx);
    }
  });

  // freshSite.rows 를 돌면서 merge
  for (const freshRow of freshSite.rows as any[]) {
    const t =
      typeof freshRow.title === "string"
        ? freshRow.title.trim()
        : "";

    // title이 없으면 키 매칭 불가 → 그냥 새 데이터로 추가
    if (!t) {
      mergedRows.push(freshRow);
      continue;
    }

    const prevIdx = indexByTitle.get(t);

    if (prevIdx == null) {
      // 완전히 새로운 제목 → 그대로 추가
      indexByTitle.set(t, mergedRows.length);
      mergedRows.push(freshRow);
    } else {
      // 같은 제목이 이미 존재
      const prevRow = mergedRows[prevIdx];

      // 🔥 요구사항: 조회수만 최신값으로 업데이트
      if (typeof freshRow.viewCount === "number") {
        (prevRow as any).viewCount = freshRow.viewCount;
      }

      // 다른 필드(openAt, openAtLabel 등)는
      // "예전 스냅샷 유지" 정책에 따라 그대로 둔다.
    }
  }

  // 메타 정보나 이름/아이디는 fresh 기준으로 사용하고,
  // rows만 우리가 merge한 배열로 대체
  return {
    ...freshSite,
    rows: mergedRows,
  };
}
