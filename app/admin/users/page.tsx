// C:\ticketcall\app\admin\users\page.tsx
// app/admin/users/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  const currentUser = session?.user as any | undefined;

  // 관리자만 접근 가능
  if (!currentUser || currentUser.role !== "admin") {
    redirect("/");
  }

  const currentUserId = currentUser.id as string;

  // 전체 유저 + 관리자 수 카운트
  const [users, adminCount] = await Promise.all([
    prisma.user.findMany({
      orderBy: { email: "asc" },
      include: {
        _count: {
          select: {
            posts: true,
            comments: true,
          },
        },
      },
    }),
    prisma.user.count({
      where: { role: "admin" },
    }),
  ]);

  // 🔧 역할 변경 서버 액션
  async function updateUserRole(formData: FormData) {
    "use server";

    const userId = String(formData.get("userId") ?? "");
    const role = String(formData.get("role") ?? "user");

    if (!userId) {
      redirect("/admin/users");
    }

    await prisma.user.update({
      where: { id: userId },
      data: { role },
    });

    redirect("/admin/users");
  }

  return (
    <main className="max-w-5xl mx-auto py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">회원 관리</h1>
        <p className="text-sm text-muted-foreground">
          사이트에 가입한 회원 목록과 권한(관리자 / 일반 사용자)을 관리하고,
          각 회원의 게시글 및 댓글 활동을 확인할 수 있습니다.
        </p>
        <div className="text-xs text-muted-foreground">
          전체 회원:{" "}
          <span className="font-semibold">{users.length}명</span>{" "}
          · 관리자:{" "}
          <span className="font-semibold">{adminCount}명</span>
        </div>
      </header>

      <section className="border rounded-lg overflow-hidden">
        <div className="border-b px-3 py-2 bg-muted/60 flex items-center justify-between">
          <span className="text-sm font-medium">회원 목록</span>
        </div>

        {users.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">
            아직 가입한 회원이 없습니다.
          </div>
        ) : (
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left w-40">이메일</th>
                <th className="px-3 py-2 text-left w-32">이름</th>
                <th className="px-3 py-2 text-left w-28">권한</th>
                <th className="px-3 py-2 text-left w-40">활동</th>
                <th className="px-3 py-2 text-left w-32">상태</th>
                <th className="px-3 py-2 text-left w-32">권한 변경</th>
              </tr>
            </thead>
             <tbody>
               {users.map((u: typeof users[0], index: number) => {
                const isCurrent = u.id === currentUserId;
                const isAdmin = u.role === "admin";
                const postCount = (u as any)._count?.posts ?? 0;
                const commentCount = (u as any)._count?.comments ?? 0;

                return (
                  <tr key={u.id} className="border-t align-top">
                    <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-[12px]">
                        {u.email ?? "-"}
                      </div>
                      {u.id && (
                        <div className="text-[10px] text-muted-foreground">
                          id: {u.id.slice(0, 8)}...
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-[12px]">
                        {u.name ?? "이름 없음"}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span
                        className={
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] " +
                          (isAdmin
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700")
                        }
                      >
                        {isAdmin ? "관리자" : "일반 사용자"}
                      </span>
                    </td>
                    {/* 🔥 활동: 글/댓글 수 + 활동 상세 보기 링크 */}
                    <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                      <div>
                        글{" "}
                        <span className="font-semibold text-foreground">
                          {postCount}
                        </span>{" "}
                        · 댓글{" "}
                        <span className="font-semibold text-foreground">
                          {commentCount}
                        </span>
                      </div>
                      <div className="mt-1">
                        <a
                          href={`/admin/users/${u.id}`}
                          className="inline-flex px-2 py-0.5 rounded border hover:bg-muted text-[11px]"
                        >
                          활동 보기
                        </a>
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] text-muted-foreground">
                      {isCurrent && (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          현재 로그인
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <form
                        action={updateUserRole}
                        className="flex items-center gap-1"
                      >
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="border rounded px-1 py-0.5 text-[11px] bg-background"
                        >
                          <option value="user">일반 사용자</option>
                          <option value="admin">관리자</option>
                        </select>
                        <button
                          type="submit"
                          className="px-2 py-1 rounded border text-[11px] hover:bg-muted"
                        >
                          적용
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
