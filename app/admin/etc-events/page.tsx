// C:\ticketcall\app\admin\etc-events\page.tsx
// app/admin/etc-events/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

type EtcEvent = {
  id: number;
  userId: string;
  title: string;
  datetime: Date;
  place: string | null;
  url: string | null;
  memo: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export default async function AdminEtcEventsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const userId = user.id as string;

  // 최근 등록된 일정들 (최신순)
  const events = await prisma.etcEvent.findMany({
    orderBy: { datetime: "desc" },
    take: 50,
  });

  // 🔧 일정 추가 서버 액션
  async function createEtcEvent(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const datetimeStr = String(formData.get("datetime") ?? "").trim();
    const place = String(formData.get("place") ?? "").trim();
    const url = String(formData.get("url") ?? "").trim();
    const memo = String(formData.get("memo") ?? "").trim();

    if (!title || !datetimeStr) {
      redirect("/admin/etc-events");
    }

    const datetime = new Date(datetimeStr);

    if (Number.isNaN(datetime.getTime())) {
      redirect("/admin/etc-events");
    }

    await prisma.etcEvent.create({
      data: {
        userId,
        title,
        datetime,
        place: place || null,
        url: url || null,
        memo: memo || null,
      },
    });

    redirect("/admin/etc-events");
  }

  // 🔧 일정 삭제 서버 액션
  async function deleteEtcEvent(formData: FormData) {
    "use server";

    const idStr = String(formData.get("id") ?? "");
    const id = Number(idStr);
    if (!id || Number.isNaN(id)) {
      redirect("/admin/etc-events");
    }

    await prisma.etcEvent.delete({
      where: { id },
    });

    redirect("/admin/etc-events");
  }

  return (
    <main className="max-w-3xl mx-auto py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">직접 공연 일정 추가</h1>
        <p className="text-sm text-muted-foreground">
          티켓 사이트에 없는 일정이나 개인적으로 관리하고 싶은 공연 일정을
          달력에 직접 추가할 수 있습니다. (관리자 전용)
        </p>
      </header>

      {/* 일정 추가 폼 */}
      <section className="border rounded-lg p-4 space-y-4">
        <h2 className="text-lg font-semibold">새 일정 등록</h2>
        <form action={createEtcEvent} className="space-y-3 text-sm">
          <div className="space-y-1">
            <label className="block text-xs font-medium">제목</label>
            <input
              type="text"
              name="title"
              required
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="공연 제목을 입력하세요"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">
              날짜 / 시간
              <span className="ml-1 text-[11px] text-muted-foreground">
                (KST 기준)
              </span>
            </label>
            <input
              type="datetime-local"
              name="datetime"
              required
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">장소 (선택)</label>
            <input
              type="text"
              name="place"
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="예: 예술의전당 콘서트홀"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">
              상세 URL (선택)
            </label>
            <input
              type="url"
              name="url"
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="공연 소개 페이지나 예매 링크 주소"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium">메모 (선택)</label>
            <textarea
              name="memo"
              className="w-full border rounded px-2 py-1 text-sm min-h-[60px]"
              placeholder="내부용 메모를 남길 수 있습니다."
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="inline-flex px-4 py-2 rounded-md bg-black text-white text-sm"
            >
              일정 등록
            </button>
          </div>
        </form>
      </section>

      {/* 등록된 일정 목록 */}
      <section className="border rounded-lg overflow-hidden">
        <div className="border-b px-3 py-2 bg-muted/60 flex items-center justify-between">
          <span className="text-sm font-medium">등록된 일정</span>
          <span className="text-xs text-muted-foreground">
            총 {events.length}건
          </span>
        </div>

        {events.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            아직 등록된 일정이 없습니다.
          </div>
        ) : (
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left w-40">일시</th>
                <th className="px-3 py-2 text-left">제목</th>
                <th className="px-3 py-2 text-left w-32">장소</th>
                <th className="px-3 py-2 text-left w-20">삭제</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e: EtcEvent) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="px-3 py-2 text-[11px] text-muted-foreground">
                    {e.datetime.toISOString().slice(0, 16).replace("T", " ")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium line-clamp-2">
                      {e.title}
                    </div>
                    {e.url && (
                      <a
                        href={e.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-600 underline"
                      >
                        링크 열기
                      </a>
                    )}
                    {e.memo && (
                      <div className="mt-1 text-[11px] text-muted-foreground line-clamp-2">
                        {e.memo}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[11px]">
                    {e.place ?? "-"}
                  </td>
                  <td className="px-3 py-2">
                    <form action={deleteEtcEvent}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="px-2 py-1 rounded border text-[11px] hover:bg-muted"
                      >
                        삭제
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
