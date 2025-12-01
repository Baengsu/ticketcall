// lib/aggregate.ts
import path from "path";
import fs from "fs/promises";

import type { MergedData } from "./types";
import { crawlMelon } from "./melon";
import { crawlInter } from "./inter";
import { crawlYes } from "./yes";
import { crawlLink } from "./link";

const DATA_DIR = path.join(process.cwd(), "data");
const BACKUP_PATH = path.join(DATA_DIR, "merged-backup.json");
const LIVE_PATH = path.join(DATA_DIR, "merged-live.json");

// 1) 4개 사이트 크롤링 + 병합
export async function buildMergedData(): Promise<MergedData> {
  const [melon, inter, yes, link] = await Promise.all([
    crawlMelon(),
    crawlInter(),
    crawlYes(),
    crawlLink(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    sites: [melon, inter, yes, link],
  };
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
