"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface BlockedUser {
  id: string;
  blockedUserId: string;
  blockedAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    nickname: string | null;
    username: string | null;
  };
}

interface BlockedUsersManagerProps {
  currentUserId: string;
}

/**
 * 차단 사용자 관리 컴포넌트
 */
export default function BlockedUsersManager({ currentUserId }: BlockedUsersManagerProps) {
  const router = useRouter();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [blockUserId, setBlockUserId] = useState("");
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 차단된 사용자 목록 로드
  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/messages/block");
      const data = await res.json();

      if (res.ok && data.ok) {
        setBlockedUsers(data.blockedUsers || []);
      } else {
        console.error("Failed to load blocked users:", data.message);
      }
    } catch (err: any) {
      console.error("Error loading blocked users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    if (!confirm("정말 차단을 해제하시겠습니까?")) {
      return;
    }

    setUnblockingId(blockedUserId);

    try {
      const res = await fetch("/api/messages/block", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedUserId }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "차단 해제에 실패했습니다.");
      }

      // 목록 새로고침
      await loadBlockedUsers();
    } catch (err: any) {
      alert(err.message || "차단 해제 중 오류가 발생했습니다.");
    } finally {
      setUnblockingId(null);
    }
  };

  const handleBlock = async () => {
    if (!blockUserId.trim()) {
      setError("사용자 ID를 입력해 주세요.");
      return;
    }

    setBlocking(true);
    setError(null);

    try {
      const res = await fetch("/api/messages/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedUserId: blockUserId.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "차단에 실패했습니다.");
      }

      alert("사용자가 차단되었습니다.");
      setShowAddDialog(false);
      setBlockUserId("");
      await loadBlockedUsers();
    } catch (err: any) {
      setError(err.message || "차단 중 오류가 발생했습니다.");
    } finally {
      setBlocking(false);
    }
  };

  const getDisplayName = (user: BlockedUser["user"]): string => {
    return user.nickname || user.username || user.name || user.email?.split("@")[0] || "알 수 없음";
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4">
        <p className="text-sm text-muted-foreground">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">차단된 사용자</h2>
          <p className="text-sm text-muted-foreground">
            차단된 사용자는 당신에게 메시지를 보낼 수 없습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
        >
          사용자 차단
        </button>
      </div>

      {blockedUsers.length === 0 ? (
        <div className="border rounded-lg p-8 text-center text-muted-foreground">
          <p className="text-sm">차단된 사용자가 없습니다.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="divide-y">
            {blockedUsers.map((blocked) => (
              <div
                key={blocked.id}
                className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">{getDisplayName(blocked.user)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    차단일: {new Date(blocked.blockedAt).toLocaleString("ko-KR", {
                      timeZone: "Asia/Seoul",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblock(blocked.blockedUserId)}
                  disabled={unblockingId === blocked.blockedUserId}
                  className="px-3 py-1.5 rounded-md border text-sm hover:bg-muted transition-colors disabled:opacity-60"
                >
                  {unblockingId === blocked.blockedUserId ? "해제 중..." : "차단 해제"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 차단 다이얼로그 */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">사용자 차단</h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    setBlockUserId("");
                    setError(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="block-user-id" className="block text-sm font-medium mb-1">
                  사용자 ID <span className="text-red-500">*</span>
                </label>
                <input
                  id="block-user-id"
                  type="text"
                  value={blockUserId}
                  onChange={(e) => setBlockUserId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm bg-background"
                  placeholder="차단할 사용자의 ID를 입력하세요"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  메시지를 보낸 사용자의 ID를 입력하세요.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddDialog(false);
                    setBlockUserId("");
                    setError(null);
                  }}
                  className="px-4 py-2 rounded-md border text-sm hover:bg-muted"
                  disabled={blocking}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={blocking || !blockUserId.trim()}
                  className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {blocking ? "차단 중..." : "차단하기"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

