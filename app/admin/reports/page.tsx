// C:\ticketcall\app\admin\reports\page.tsx
// app/admin/reports/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminReportsPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  if (!user || user.role !== "admin") {
    redirect("/"); // 혹은 404로 보내고 싶으면 notFound();
  }

  const pendingReports = await prisma.report.findMany({
    where: { status: "pending" },
    include: {
      post: {
        include: { category: true },
      },
      reporter: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const handledReports = await prisma.report.findMany({
    where: { status: { in: ["resolved", "ignored"] } },
    include: {
      post: {
        include: { category: true },
      },
      reporter: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  async function updateReport(
    formData: FormData,
    status: "resolved" | "ignored"
  ) {
    "use server";
    const id = formData.get("id");
    if (typeof id !== "string") return;

    await prisma.report.update({
      where: { id },
      data: { status },
    });

    redirect("/admin/reports");
  }

  return (
    <main className="p-6 space-y-6 max-w-5xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold mb-1">신고 관리</h1>
        <p className="text-sm text-muted-foreground">
          게시글 신고 내역을 확인하고 처리할 수 있습니다.
        </p>
      </header>

      {/* 미처리 신고 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          처리 대기 중 신고 ({pendingReports.length}건)
        </h2>
        <div className="border rounded-lg overflow-hidden">
          {pendingReports.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              처리 대기 중인 신고가 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-32">대상</th>
                  <th className="px-3 py-2 text-left">사유</th>
                  <th className="px-3 py-2 text-left w-32">신고자</th>
                  <th className="px-3 py-2 text-left w-40">시간</th>
                  <th className="px-3 py-2 text-left w-40">처리</th>
                </tr>
              </thead>
              <tbody>
                {pendingReports.map((r: typeof pendingReports[0]) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 align-top text-xs">
                      {r.targetType === "post" && r.post ? (
                        <div className="space-y-1">
                          <div className="font-medium">
                            {r.post.category?.name ?? ""} 게시글
                          </div>
                          <a
                            href={`/board/${r.post.category?.slug}/${r.post.id}`}
                            className="text-[11px] underline"
                          >
                            글 보기
                          </a>
                        </div>
                      ) : (
                        r.targetType
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-sm">
                      {r.reason ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      {r.reporter?.email ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {r.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      <form
                        action={updateReport.bind(null, undefined as any, "resolved")}
                        className="inline-block mr-1"
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="px-2 py-1 rounded bg-green-600 text-white"
                        >
                          처리 완료
                        </button>
                      </form>
                      <form
                        action={updateReport.bind(null, undefined as any, "ignored")}
                        className="inline-block"
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <button
                          type="submit"
                          className="px-2 py-1 rounded bg-gray-500 text-white mt-1"
                        >
                          무시
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 처리 완료/무시된 신고 */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          최근 처리된 신고 (최근 {handledReports.length}건)
        </h2>
        <div className="border rounded-lg overflow-hidden">
          {handledReports.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground">
              아직 처리된 신고가 없습니다.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left w-32">상태</th>
                  <th className="px-3 py-2 text-left w-32">대상</th>
                  <th className="px-3 py-2 text-left">사유</th>
                  <th className="px-3 py-2 text-left w-32">신고자</th>
                  <th className="px-3 py-2 text-left w-40">시간</th>
                </tr>
              </thead>
              <tbody>
                {handledReports.map((r: typeof handledReports[0]) => (
                  <tr key={r.id} className="border-t">
                    <td className="px-3 py-2 align-top text-xs">
                      {r.status === "resolved" ? "처리 완료" : "무시"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      {r.targetType === "post" && r.post
                        ? `${r.post.category?.name ?? ""} 게시글`
                        : r.targetType}
                    </td>
                    <td className="px-3 py-2 align-top text-sm">
                      {r.reason ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs">
                      {r.reporter?.email ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                      {r.createdAt
                        .toISOString()
                        .slice(0, 16)
                        .replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
