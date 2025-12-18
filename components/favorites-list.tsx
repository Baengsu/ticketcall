"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, ChevronDown, X } from "lucide-react";
import type { EventItem } from "@/app/page";

export default function FavoritesList({ events }: { events: EventItem[] }) {
  const { data: session } = useSession();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const refreshFavorites = useCallback(() => {
    if (session?.user) {
      fetch("/api/favorites")
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setFavoriteIds(data.favorites || []);
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    refreshFavorites();
  }, [refreshFavorites]);

  // 주기적으로 찜한 목록 새로고침 (다른 탭에서 변경된 경우 대비)
  useEffect(() => {
    if (session?.user) {
      const interval = setInterval(() => {
        refreshFavorites();
      }, 5000); // 5초마다 새로고침

      return () => clearInterval(interval);
    }
  }, [session, refreshFavorites]);

  if (!session?.user || loading) {
    return null;
  }

  const favoriteEvents = events.filter((ev) => favoriteIds.includes(ev.id));

  if (favoriteIds.length === 0) {
    return null;
  }

  // 최소화된 상태
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-pink-600 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 flex items-center justify-center border-2 border-pink-300 dark:border-pink-700"
          aria-label="찜한 공연 목록 열기"
        >
          <Heart className="w-6 h-6 fill-white" />
          {favoriteIds.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-pink-600 text-xs font-bold flex items-center justify-center border-2 border-pink-500">
              {favoriteIds.length}
            </span>
          )}
        </button>
      </div>
    );
  }

  // 확장된 상태
  return (
    <div className="fixed bottom-6 right-6 z-50 w-full sm:w-96 max-w-[calc(100vw-3rem)]">
      <Card className="border-2 border-pink-200 dark:border-pink-800 bg-gradient-to-br from-pink-50/95 to-rose-50/95 dark:from-pink-950/95 dark:to-rose-950/95 shadow-2xl backdrop-blur-sm">
        <CardHeader className="pb-3 relative">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-pink-500 text-pink-500" />
              <span className="bg-gradient-to-r from-pink-600 to-rose-600 text-transparent bg-clip-text font-bold">
                찜한 공연
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                {favoriteIds.length}개
              </span>
            </CardTitle>
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-md hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors"
              aria-label="최소화"
            >
              <ChevronDown className="w-4 h-4 text-pink-600 dark:text-pink-400" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {favoriteEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                찜한 공연이 없습니다
              </p>
            ) : (
              favoriteEvents.map((ev) => {
                const date = new Date(ev.openAt);
                const dateStr = date.toLocaleDateString("ko-KR", {
                  month: "short",
                  day: "numeric",
                });
                const timeStr = date.toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                });

                const handleRemoveFavorite = async (e: React.MouseEvent) => {
                  e.preventDefault();
                  e.stopPropagation();

                  try {
                    const res = await fetch("/api/favorites", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ eventId: ev.id }),
                    });

                    const data = await res.json();
                    if (data.ok) {
                      // 목록 새로고침
                      refreshFavorites();
                    }
                  } catch (error) {
                    console.error("Remove favorite error:", error);
                  }
                };

                return (
                  <div
                    key={ev.id}
                    className="group relative p-2 rounded-lg bg-white/60 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-all border border-pink-200/50 dark:border-pink-800/50 hover:border-pink-300 dark:hover:border-pink-700"
                  >
                    <a
                      href={ev.detailUrl || "#"}
                      target={ev.detailUrl ? "_blank" : undefined}
                      rel={ev.detailUrl ? "noopener noreferrer" : undefined}
                      className="block"
                    >
                      <div className="flex items-start justify-between gap-2 pr-6">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground line-clamp-2 mb-1">
                            {ev.title}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{ev.siteName}</span>
                            <span>·</span>
                            <span>
                              {dateStr} {timeStr}
                            </span>
                          </div>
                        </div>
                        <Heart className="w-3 h-3 flex-shrink-0 fill-pink-500 text-pink-500 mt-0.5" />
                      </div>
                    </a>
                    <button
                      onClick={handleRemoveFavorite}
                      className="absolute top-2 right-2 p-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 dark:hover:bg-red-900/50"
                      aria-label="찜 취소"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
