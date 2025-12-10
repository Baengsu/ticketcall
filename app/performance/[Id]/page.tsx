// C:\ticketcall\app\performance\[id]\page.tsx
// app/performance/[id]/page.tsx

import { notFound } from "next/navigation";
import { getEventById } from "@/lib/events";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

function formatDateLabel(openAt?: string, openAtLabel?: string): string {
  if (openAtLabel) return openAtLabel;
  if (!openAt) return "-";
  // "2025-11-20T15:00" -> "2025-11-20 15:00"
  return openAt.slice(0, 16).replace("T", " ");
}

export default async function PerformanceDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  const event = getEventById(id);

  if (!event) {
    notFound();
  }

  const {
    siteId,
    siteName,
    title,
    category,
    openAt,
    showAt,
    openAtLabel,
    detailUrl,
    viewCount,
    raw,
  } = event;

  const openLabel = formatDateLabel(openAt, openAtLabel);

  return (
    <main className="container mx-auto py-10 space-y-6">
      <header className="space-y-2">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {siteName} · {siteId}
          {category ? ` · ${category}` : ""}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span>
            예매 오픈: <span className="font-medium">{openLabel}</span>
          </span>
          {showAt && (
            <span>
              공연 일시:{" "}
              <span className="font-medium">
                {showAt.slice(0, 16).replace("T", " ")}
              </span>
            </span>
          )}
          {typeof viewCount === "number" && (
            <span>조회수: {viewCount.toLocaleString()}회</span>
          )}
        </div>
      </header>

      {/* 예매 링크 박스 */}
      <section className="border rounded-lg p-4 space-y-3 text-sm">
        <h2 className="text-base font-semibold">예매 정보</h2>
        {detailUrl ? (
          <>
            <p className="text-muted-foreground">
              아래 버튼을 클릭하면 원본 예매/공지 페이지로 이동합니다.
            </p>
            <a
              href={detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex px-4 py-2 rounded-md bg-black text-white text-sm"
            >
              예매 페이지 바로가기
            </a>
          </>
        ) : (
          <p className="text-muted-foreground">
            이 공연에 대한 원본 링크 정보가 없습니다.
          </p>
        )}
      </section>

      {/* 원본 데이터 디버그용 (숨길 수도 있음) */}
      <section className="border rounded-lg p-4 text-xs bg-muted/40">
        <details>
          <summary className="cursor-pointer font-semibold">
            원본 데이터 보기 (디버그용)
          </summary>
          <pre className="mt-2 whitespace-pre-wrap break-all">
            {JSON.stringify(raw, null, 2)}
          </pre>
        </details>
      </section>
    </main>
  );
}
