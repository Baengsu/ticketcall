// lib/melon.ts
import type { SiteDataset } from "./types";

export async function crawlMelon(): Promise<SiteDataset> {
  const rows = [
    {
      title: "멜론 테스트 공연 1",
      openAt: "2025-12-03T20:00",
      showAt: "2025-12-10T19:30",
      price: 50000,
    },
    {
      title: "멜론 테스트 공연 2",
      openAt: "2025-12-05T20:00",
      showAt: "2025-12-21T18:00",
      price: 70000,
    },
  ];

  return {
    id: "melon",
    name: "멜론",
    rows,
    meta: {
      url: "https://example-melon.com",
      count: rows.length,
    },
  };
}
