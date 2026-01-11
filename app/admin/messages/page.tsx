// app/admin/messages/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

interface PageProps {
  searchParams: Promise<{
    senderId?: string;
    receiverId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AdminMessagesPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  // 관리자만 접근 가능 (서버 사이드 체크)
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  const params = await searchParams;
  const senderId = params.senderId;
  const receiverId = params.receiverId;
  const startDate = params.startDate;
  const endDate = params.endDate;

  // 필터 조건 구성
  const where: any = {};
  if (senderId) {
    where.senderId = senderId;
  }
  if (receiverId) {
    where.receiverId = receiverId;
  }
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = new Date(startDate);
    }
    if (endDate) {
      // endDate의 다음 날 00:00:00까지 포함하기 위해 하루를 더함
      const end = new Date(endDate);
      end.setDate(end.getDate() + 1);
      where.createdAt.lte = end;
    }
  }

  // 모든 메시지 조회 (소프트 삭제된 메시지 포함 - 관리자는 모두 볼 수 있음)
  const messages = await prisma.message.findMany({
    where,
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          nickname: true,
          username: true,
        },
      },
      receiver: {
        select: {
          id: true,
          name: true,
          email: true,
          nickname: true,
          username: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200, // 최대 200개
  });

  // 사용자 목록 (필터링용)
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      nickname: true,
      username: true,
    },
    orderBy: { email: "asc" },
  });

  const getDisplayName = (user: { name: string | null; email: string | null; nickname: string | null; username: string | null }) => {
    return user.nickname || user.username || user.name || user.email || "알 수 없음";
  };

  return (
    <main className="max-w-7xl mx-auto py-10 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">메시지 로그</h1>
        <p className="text-sm text-muted-foreground">
          모든 메시지를 조회할 수 있습니다. 읽기 전용입니다.
        </p>
      </header>

      {/* 필터 폼 */}
      <section className="border rounded-lg p-4 bg-card">
        <form method="get" action="/admin/messages" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 발신자 필터 */}
            <div>
              <label htmlFor="senderId" className="block text-sm font-medium mb-1">
                발신자
              </label>
              <select
                id="senderId"
                name="senderId"
                className="w-full px-3 py-2 border rounded-md text-sm"
                defaultValue={senderId || ""}
              >
                <option value="">전체</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {getDisplayName(u)}
                  </option>
                ))}
              </select>
            </div>

            {/* 수신자 필터 */}
            <div>
              <label htmlFor="receiverId" className="block text-sm font-medium mb-1">
                수신자
              </label>
              <select
                id="receiverId"
                name="receiverId"
                className="w-full px-3 py-2 border rounded-md text-sm"
                defaultValue={receiverId || ""}
              >
                <option value="">전체</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {getDisplayName(u)}
                  </option>
                ))}
              </select>
            </div>

            {/* 시작 날짜 */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                시작 날짜
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue={startDate || ""}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>

            {/* 종료 날짜 */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                종료 날짜
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                defaultValue={endDate || ""}
                className="w-full px-3 py-2 border rounded-md text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              필터 적용
            </button>
            <a
              href="/admin/messages"
              className="px-4 py-2 rounded-md border text-sm font-medium hover:bg-muted"
            >
              필터 초기화
            </a>
          </div>
        </form>
      </section>

      {/* 메시지 목록 */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            메시지 목록 ({messages.length}건)
          </h2>
          {(senderId || receiverId || startDate || endDate) && (
            <span className="text-xs text-muted-foreground">
              필터 적용 중
            </span>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              메시지가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold w-32">시간</th>
                    <th className="px-4 py-3 text-left font-semibold w-40">발신자</th>
                    <th className="px-4 py-3 text-left font-semibold w-40">수신자</th>
                    <th className="px-4 py-3 text-left font-semibold w-32">제목</th>
                    <th className="px-4 py-3 text-left font-semibold">내용</th>
                    <th className="px-4 py-3 text-left font-semibold w-24">읽음</th>
                    <th className="px-4 py-3 text-left font-semibold w-32">삭제 상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {messages.map((msg) => (
                    <tr key={msg.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {msg.createdAt.toLocaleString("ko-KR", {
                          timeZone: "Asia/Seoul",
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <div className="font-medium">{getDisplayName(msg.sender)}</div>
                          <div className="text-muted-foreground">{msg.sender.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs">
                          <div className="font-medium">{getDisplayName(msg.receiver)}</div>
                          <div className="text-muted-foreground">{msg.receiver.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs font-medium">
                          {msg.title || "(제목 없음)"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs line-clamp-2 max-w-md">
                          {msg.content}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs ${
                            msg.isRead
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {msg.isRead ? "읽음" : "안 읽음"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                        {msg.deletedBySenderAt && msg.deletedByReceiverAt ? (
                          <span className="text-red-600">양쪽 삭제</span>
                        ) : msg.deletedBySenderAt ? (
                          <span>발신자 삭제</span>
                        ) : msg.deletedByReceiverAt ? (
                          <span>수신자 삭제</span>
                        ) : (
                          <span className="text-green-600">정상</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

