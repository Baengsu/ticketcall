// lib/types.ts

// lib/types.ts (혹은 SiteId 정의돼 있는 곳)

export type SiteId =
  | "melon"
  | "inter"
  | "yes"
  | "link"
  | "etc"; // 👈 이 줄 추가


export interface SiteDataset {
  id: SiteId;
  name: string;                         // 사이트 이름 (멜론, 인터파크 등)
  rows: Array<Record<string, any>>;     // 테이블/시각화에 쓸 데이터 행들
  meta?: Record<string, any>;           // url, count, etc
}

export interface MergedData {
  generatedAt: string;                  // 병합 수행 시각
  sites: SiteDataset[];                 // 4개 사이트 데이터
}
