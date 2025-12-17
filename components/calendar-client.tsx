// components/calendar-client.tsx
"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import type { EventItem } from "@/app/page";

type CalendarCell = {
  date: string | null; // YYYY-MM-DD or null
  events: EventItem[];
  isCurrentMonth: boolean;
};

type CalendarMonth = {
  year: number;
  month: number; // 0-11
  cells: CalendarCell[];
};

export default function CalendarClient({ events }: { events: EventItem[] }) {
  // 브라우저 기준 "오늘" (한국에서 쓰면 사실상 KST)
  const today = new Date();
  const todayKey = dateKey(today);

  // 현재 보고 있는 달을 Date 하나로만 관리
  const [current, setCurrent] = useState<Date>(() => {
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const year = current.getFullYear();
  const month = current.getMonth(); // 0-11

  const calendar: CalendarMonth = useMemo(
    () => buildCalendarMonth(events, year, month),
    [events, year, month]
  );

  const handlePrevMonth = () => {
    setCurrent((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return new Date(y, m - 1, 1);
    });
  };

  const handleNextMonth = () => {
    setCurrent((prev) => {
      const y = prev.getFullYear();
      const m = prev.getMonth();
      return new Date(y, m + 1, 1);
    });
  };

  // 한국 시간 기준 오늘 날짜 포맷팅
  const todayFormatted = useMemo(() => {
    const kstDate = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));
    const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
    const dayNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const month = monthNames[kstDate.getMonth()];
    const day = dayNames[kstDate.getDay()];
    const date = kstDate.getDate();
    return `${kstDate.getFullYear()}년 ${month} ${date}일 ${day}`;
  }, [today]);

  // 현재 월 포맷팅
  const currentMonthFormatted = useMemo(() => {
    const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
    return `${calendar.year}년 ${monthNames[calendar.month]}`;
  }, [calendar]);

  return (
    <Card className="w-full overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
      <CardHeader className="pb-4 sm:pb-6 px-4 sm:px-6 lg:px-10 xl:px-12 2xl:px-16 pt-6 bg-gradient-to-r from-blue-50/50 via-purple-50/50 to-pink-50/50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                <CalendarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-transparent bg-clip-text">
                  {currentMonthFormatted}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                    오늘: {todayFormatted}
                  </span>
                </CardDescription>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
              onClick={handlePrevMonth}
              aria-label="이전 달"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg border-2 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm"
              onClick={handleNextMonth}
              aria-label="다음 달"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 md:p-6 lg:p-8 xl:p-10 2xl:p-12">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3 mb-2 sm:mb-3 lg:mb-4">
          {["일", "월", "화", "수", "목", "금", "토"].map((d, idx) => (
            <div
              key={d}
              className={`text-center font-semibold py-2 sm:py-3 lg:py-4 rounded-lg text-[10px] sm:text-xs md:text-sm lg:text-base xl:text-lg ${
                idx === 0
                  ? "text-red-500 dark:text-red-400"
                  : idx === 6
                  ? "text-blue-500 dark:text-blue-400"
                  : "text-muted-foreground"
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        {/* 캘린더 그리드 */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2 lg:gap-3 xl:gap-4 bg-border rounded-lg overflow-hidden p-1 sm:p-2 lg:p-3 xl:p-4">
          {calendar.cells.map((cell, idx) => {
            const isToday = cell.date === todayKey && cell.isCurrentMonth;
            const isWeekend = cell.date && (new Date(cell.date).getDay() === 0 || new Date(cell.date).getDay() === 6);

            return (
              <div
                key={idx}
                className={
                  "min-h-[60px] sm:min-h-[80px] md:min-h-[100px] lg:min-h-[130px] xl:min-h-[160px] 2xl:min-h-[180px] bg-background rounded-md p-1 sm:p-1.5 md:p-2 lg:p-2.5 xl:p-3 flex flex-col transition-all hover:shadow-md " +
                  (cell.isCurrentMonth
                    ? isToday
                      ? "ring-2 ring-primary shadow-lg bg-primary/5"
                      : "hover:bg-muted/50"
                    : "bg-muted/30 text-muted-foreground opacity-60")
                }
              >
                <div className="flex justify-between items-start mb-1">
                  {cell.date ? (
                    <span
                      className={
                        "text-[10px] sm:text-xs md:text-sm font-bold rounded-md px-1.5 sm:px-2 py-0.5 transition-all " +
                        (isToday
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md scale-110"
                          : isWeekend && cell.isCurrentMonth
                          ? isWeekend && new Date(cell.date).getDay() === 0
                            ? "text-red-500 dark:text-red-400"
                            : "text-blue-500 dark:text-blue-400"
                          : "text-foreground")
                      }
                    >
                      {cell.date.split("-")[2]}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-0">0</span>
                  )}
                </div>
                <div className="mt-auto space-y-0.5 sm:space-y-1 flex-1 overflow-hidden">
                  {cell.events.map((ev) => (
                    <EventPopover key={ev.id} ev={ev} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- 달력 계산 로직 ----

function buildCalendarMonth(
  events: EventItem[],
  year: number,
  month: number
): CalendarMonth {
  const firstOfMonth = new Date(year, month, 1);
  const startWeekDay = firstOfMonth.getDay(); // 0: 일요일
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 선택된 월에 속한 이벤트만 필터링 (openAt 기준)
  const map: Record<string, EventItem[]> = {};
  for (const ev of events) {
    const d = parseDate(ev.openAt);
    if (!d) continue;
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    const key = dateKey(d);
    if (!map[key]) map[key] = [];
    map[key].push(ev);
  }

  const totalCells = Math.ceil((startWeekDay + daysInMonth) / 7) * 7;
  const cells: CalendarCell[] = [];

  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekDay + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ date: null, events: [], isCurrentMonth: false });
    } else {
      const d = new Date(year, month, dayNum);
      const key = dateKey(d);
      cells.push({
        date: key,
        events: map[key] ?? [],
        isCurrentMonth: true,
      });
    }
  }

  return { year, month, cells };
}

function parseDate(dt: string): Date | null {
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractTime(dt: string): string {
  const parts = dt.split("T");
  if (parts.length === 2) {
    return parts[1].slice(0, 5); // HH:mm
  }
  const tokens = dt.split(" ");
  return (tokens[1] ?? "").slice(0, 5);
}

function formatDateTimeLabel(dt: string): string {
  if (!dt) return "";
  const date = (dt.split("T")[0] ?? dt.slice(0, 10)).trim();
  const time = extractTime(dt);
  return `${date} ${time}`;
}

function truncate(str: string, max: number): string {
  if (!str) return "";
  if (str.length <= max) return str;
  return str.slice(0, max - 1) + "…";
}

function getSiteIcon(siteId: string): string | null {
  switch (siteId) {
    case "yes":
      return "/yes.ico";
    case "melon":
      return "/melon.ico";
    case "inter":
      return "/inter.ico";
    case "link":
      return "/link.ico";
    case "etc":
      return "/etc.ico"; // 있으면 사용, 없으면 만들어도 좋고
    default:
      return null;
  }
}

// ---- 팝오버(스티커) ----

function EventPopover({ ev }: { ev: EventItem }) {
  const shortTitle = truncate(ev.title, 20);
  const hasView = typeof ev.viewCount === "number";
  const isHot = hasView && (ev.viewCount ?? 0) >= 10000;
  const iconSrc = getSiteIcon(ev.siteId);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={
            "block w-full text-left rounded-md px-1.5 py-1 sm:px-2 sm:py-1.5 transition-all hover:scale-105 " +
            (isHot
              ? "bg-gradient-to-r from-pink-200 to-rose-200 dark:from-pink-900/40 dark:to-rose-900/40 hover:from-pink-300 hover:to-rose-300 dark:hover:from-pink-900/60 dark:hover:to-rose-900/60 border border-pink-300 dark:border-pink-700"
              : "bg-primary/10 hover:bg-primary/20 border border-primary/20")
          }
        >
          <div className="flex items-center justify-between gap-1">
            {/* 왼쪽: 아이콘 + 제목 */}
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {iconSrc && (
                <img
                  src={iconSrc}
                  alt={ev.siteId}
                  className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0"
                />
              )}
              <span
                className={
                  "truncate text-[9px] sm:text-[10px] md:text-[11px] " +
                  (isHot ? "font-bold text-pink-700 dark:text-pink-300" : "font-medium")
                }
              >
                {shortTitle}
              </span>
            </div>

            {/* 오른쪽: 조회수 */}
            {hasView && (
              <span className="flex-shrink-0 text-[8px] sm:text-[9px] text-muted-foreground font-medium">
                {ev.viewCount}
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>



      <PopoverContent
        side="bottom"
        align="start"
        className="w-72 sm:w-80 md:w-96 p-4 sm:p-5 space-y-3 shadow-xl border-2"
      >
        <div className="flex items-center gap-2 text-xs sm:text-sm uppercase text-muted-foreground font-semibold pb-2 border-b">
          {iconSrc && (
            <img
              src={iconSrc}
              alt={ev.siteId}
              className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0"
            />
          )}
          <span>{ev.siteName}</span>
        </div>
        <div className="font-bold text-sm sm:text-base md:text-lg leading-tight">
          {ev.title}
        </div>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
          <span className="font-medium">예매 오픈:</span>
          <span className="font-semibold text-foreground">
            {formatDateTimeLabel(ev.openAt)}
          </span>
        </div>
        {hasView && (
          <div
            className={
              "flex items-center gap-2 text-xs sm:text-sm " +
              (isHot
                ? "text-red-600 dark:text-red-400 font-bold"
                : "text-muted-foreground font-medium")
            }
          >
            <span>조회수:</span>
            <span className="font-bold">{ev.viewCount.toLocaleString()}회</span>
            {isHot && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold">
                🔥 HOT
              </span>
            )}
          </div>
        )}

        {/* 🔥 예매 / 상세 페이지 바로가기 버튼 */}
        {ev.detailUrl && (
          <div className="pt-2 border-t">
            <a
              href={ev.detailUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs sm:text-sm font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
            >
              예매 / 상세 페이지 이동 →
            </a>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

