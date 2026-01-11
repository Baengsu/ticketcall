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
      reporter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // 타겟 정보 별도 조회 (POST 또는 COMMENT)
  const reportsWithTargets = await Promise.all(
    pendingReports.map(async (report) => {
      let target: any = null;
      if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            title: true,
            authorId: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });
        target = post;
      } else if (report.targetType === "COMMENT") {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            content: true,
            authorId: true,
            post: {
              select: {
                id: true,
                title: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        });
        target = comment;
      }
      return { ...report, target };
    })
  );

  const handledReports = await prisma.report.findMany({
    where: { status: { in: ["resolved", "ignored"] } },
    include: {
      reporter: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 타겟 정보 별도 조회
  const handledReportsWithTargets = await Promise.all(
    handledReports.map(async (report) => {
      let target: any = null;
      if (report.targetType === "POST") {
        const post = await prisma.post.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            title: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        });
        target = post;
      } else if (report.targetType === "COMMENT") {
        const comment = await prisma.comment.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            content: true,
            post: {
              select: {
                id: true,
                title: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        });
        target = comment;
      }
      return { ...report, target };
    })
  );

  const adminId = user.id as string;

  // 신고 처리 액션: 콘텐츠 숨김 및 신고 상태 업데이트
  async function hideContentAction(formData: FormData) {
    "use server";
    const reportId = formData.get("reportId") as string;
    const targetType = formData.get("targetType") as string;
    const targetId = Number(formData.get("targetId"));
    const actionReason = formData.get("reason") as string;
    const warnUser = formData.get("warnUser") === "true";

    if (!reportId || !targetType || !targetId) {
      redirect("/admin/reports");
    }

    const session = await getServerSession(authOptions);
    const admin = session?.user as any | undefined;
    if (!admin || admin.role !== "admin") {
      redirect("/admin/reports");
    }

    const now = new Date();
    const reason = actionReason?.trim() || "신고에 따른 콘텐츠 숨김 처리";

    await prisma.$transaction(async (tx) => {
      // 타겟 정보 조회 (작성자 ID 확인용)
      let authorId: string | null = null;
      if (targetType === "POST") {
        const post = await tx.post.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        authorId = post?.authorId ?? null;
      } else if (targetType === "COMMENT") {
        const comment = await tx.comment.findUnique({
          where: { id: targetId },
          select: { authorId: true },
        });
        authorId = comment?.authorId ?? null;
      }

      // 콘텐츠 숨김 처리
      if (targetType === "POST") {
        await tx.post.update({
          where: { id: targetId },
          data: {
            isHidden: true,
            hiddenAt: now,
            hiddenReason: reason,
          },
        });
      } else if (targetType === "COMMENT") {
        await tx.comment.update({
          where: { id: targetId },
          data: {
            isHidden: true,
            hiddenAt: now,
            hiddenReason: reason,
          },
        });
      }

      // 사용자 경고 (필요한 경우)
      if (warnUser && authorId) {
        await tx.notification.create({
          data: {
            userId: authorId,
            type: "admin_warning",
            message: `귀하의 콘텐츠가 신고되어 숨김 처리되었습니다. 사유: ${reason}`,
          },
        });
      }

      // 신고 상태 업데이트
      await tx.report.update({
        where: { id: reportId },
        data: { status: "resolved" },
      });

      // AdminActionLog 기록
      await tx.adminActionLog.create({
        data: {
          adminId: admin.id as string,
          actionType: targetType === "POST" ? "HIDE_POST" : "HIDE_COMMENT",
          targetType,
          targetId: String(targetId),
          reason: `신고 처리: ${reason}${warnUser && authorId ? " (사용자 경고 포함)" : ""}`,
          oldValue: JSON.stringify({ isHidden: false }),
          newValue: JSON.stringify({ isHidden: true, hiddenAt: now, hiddenReason: reason, warned: warnUser }),
        },
      });
    });

    redirect("/admin/reports");
  }

  // 신고 무시 액션
  async function ignoreReportAction(formData: FormData) {
    "use server";
    const reportId = formData.get("reportId") as string;

    if (!reportId) {
      redirect("/admin/reports");
    }

    const session = await getServerSession(authOptions);
    const admin = session?.user as any | undefined;
    if (!admin || admin.role !== "admin") {
      redirect("/admin/reports");
    }

    await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({
        where: { id: reportId },
        select: { targetType: true, targetId: true },
      });

      if (!report) {
        return;
      }

      // 신고 상태 업데이트
      await tx.report.update({
        where: { id: reportId },
        data: { status: "ignored" },
      });

      // AdminActionLog 기록
      await tx.adminActionLog.create({
        data: {
          adminId: admin.id as string,
          actionType: "IGNORE_REPORT",
          targetType: "REPORT",
          targetId: reportId,
          reason: "신고 무시 처리",
          oldValue: JSON.stringify({ status: "pending" }),
          newValue: JSON.stringify({ status: "ignored" }),
        },
      });
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
                {reportsWithTargets.map((r) => {
                  const target = r.target;
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 align-top text-xs">
                        {r.targetType === "POST" && target && "title" in target ? (
                          <div className="space-y-1">
                            <div className="font-medium">
                              {target.category?.name ?? ""} 게시글
                            </div>
                            <a
                              href={`/board/${target.category?.slug}/${target.id}`}
                              className="text-[11px] underline"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              글 보기
                            </a>
                          </div>
                        ) : r.targetType === "COMMENT" && target && "content" in target ? (
                          <div className="space-y-1">
                            <div className="font-medium">댓글</div>
                            {target.post && (
                              <a
                                href={`/board/${target.post.category?.slug}/${target.post.id}`}
                                className="text-[11px] underline"
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                게시글 보기
                              </a>
                            )}
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
                        <div className="space-y-1">
                          <form action={hideContentAction} className="inline-block">
                            <input type="hidden" name="reportId" value={r.id} />
                            <input type="hidden" name="targetType" value={r.targetType} />
                            <input type="hidden" name="targetId" value={r.targetId} />
                            <input type="hidden" name="reason" value={`신고 처리: ${r.reason}`} />
                            <input type="hidden" name="warnUser" value="false" />
                            <button
                              type="submit"
                              className="px-2 py-1 rounded bg-red-600 text-white text-xs"
                            >
                              숨김
                            </button>
                          </form>
                          {target && (("authorId" in target && target.authorId) || (target.post && "authorId" in target.post && target.post.authorId)) && (
                            <form action={hideContentAction} className="inline-block ml-1">
                              <input type="hidden" name="reportId" value={r.id} />
                              <input type="hidden" name="targetType" value={r.targetType} />
                              <input type="hidden" name="targetId" value={r.targetId} />
                              <input type="hidden" name="reason" value={`신고 처리: ${r.reason}`} />
                              <input type="hidden" name="warnUser" value="true" />
                              <button
                                type="submit"
                                className="px-2 py-1 rounded bg-orange-600 text-white text-xs"
                              >
                                숨김+경고
                              </button>
                            </form>
                          )}
                          <form action={ignoreReportAction} className="inline-block ml-1">
                            <input type="hidden" name="reportId" value={r.id} />
                            <button
                              type="submit"
                              className="px-2 py-1 rounded bg-gray-500 text-white text-xs"
                            >
                              무시
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
                {handledReportsWithTargets.map((r) => {
                  const target = r.target;
                  return (
                    <tr key={r.id} className="border-t">
                      <td className="px-3 py-2 align-top text-xs">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            r.status === "resolved"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {r.status === "resolved" ? "처리 완료" : "무시"}
                        </span>
                      </td>
                      <td className="px-3 py-2 align-top text-xs">
                        {r.targetType === "POST" && target && "title" in target
                          ? `${target.category?.name ?? ""} 게시글`
                          : r.targetType === "COMMENT" && target && "content" in target
                          ? "댓글"
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
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
