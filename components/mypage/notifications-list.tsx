"use client";

import { useState } from "react";

interface Notification {
  id: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

interface NotificationsListProps {
  notifications: Notification[];
}

const ITEMS_PER_PAGE = 5;

export default function NotificationsList({
  notifications,
}: NotificationsListProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentNotifications = notifications.slice(startIndex, endIndex);

  if (notifications.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="text-2xl mb-1">🔔</div>
        <p className="text-xs text-muted-foreground">
          아직 도착한 알림이 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 알림 목록 */}
      <ul className="space-y-1.5">
        {currentNotifications.map((n) => (
          <li
            key={n.id}
            className="flex items-start justify-between gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs leading-relaxed">{n.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(n.createdAt).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {!n.read && (
              <span className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold bg-blue-100 dark:bg-blue-900/30 px-1.5 py-0.5 rounded whitespace-nowrap">
                NEW
              </span>
            )}
          </li>
        ))}
      </ul>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 pt-2 border-t">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-2 py-1 text-xs rounded min-w-[28px] ${
                  currentPage === page
                    ? "bg-primary text-primary-foreground"
                    : "border hover:bg-muted"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-xs rounded border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}

      {/* 전체 알림 개수 표시 */}
      <p className="text-[10px] text-muted-foreground text-center pt-1">
        전체 {notifications.length}개
      </p>
    </div>
  );
}

