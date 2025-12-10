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

// lib/types.ts 맨 아래에 추가

// 병합된 공연 데이터 한 건에 대한 공통 뷰 (필수+선택 필드 혼합)
export interface OpenEvent {
  // 어떤 사이트에서 온 데이터인지
  siteId: SiteId;
  siteName: string;

  // 공통적으로 자주 쓰는 필드들
  id: string;               // 원본 사이트의 id (예: "16927")
  title: string;            // 공연/공지 제목
  category?: string;        // 티켓오픈 / 콘서트 / 뮤지컬 등
  openAt?: string;          // 예매 오픈 시간 ISO (2025-11-20T15:00)
  showAt?: string;          // 공연 시작일/시각
  openAtLabel?: string;     // 사람이 보기 좋은 라벨 (예: "2025.11.20(목) 15:00")
  detailUrl?: string;       // 원본 예매 페이지 URL
  viewCount?: number;       // YES24 기준 조회수 등

  // 그 외 사이트별 모든 원본 데이터
  raw: Record<string, any>;
}

// 공연 상세 페이지에서 사용할 내부 ID 형식: `${siteId}:${rowId}`
export type OpenEventId = string;

