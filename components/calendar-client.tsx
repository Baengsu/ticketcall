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

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">
            {calendar.year}년 {calendar.month + 1}월
          </CardTitle>
          <CardDescription className="text-xs">
            한국 시간 기준 오늘 날짜: {todayKey}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handlePrevMonth}
          >
            ‹
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-7 w-7"
            onClick={handleNextMonth}
          >
            ›
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 text-[11px] font-medium text-muted-foreground mb-1">
          {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
            <div key={d} className="px-1 py-1 text-center">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {calendar.cells.map((cell, idx) => {
            const isToday = cell.date === todayKey && cell.isCurrentMonth;

            return (
              <div
                key={idx}
                className={
                  "min-h-[90px] bg-background p-1 flex flex-col " +
                  (cell.isCurrentMonth
                    ? ""
                    : " bg-muted/40 text-muted-foreground")
                }
              >
                <div className="flex justify-between items-center">
                  {cell.date ? (
                    <span
                      className={
                        "text-[11px] font-medium rounded px-1 " +
                        (isToday
                          ? "bg-primary/20 text-primary-foreground"
                          : "")
                      }
                    >
                      {cell.date.split("-")[2]}
                    </span>
                  ) : (
                    <span className="text-[11px] opacity-0">0</span>
                  )}
                </div>
                <div className="mt-1 space-y-1">
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

// ---- 팝오버(스티커) ----

function EventPopover({ ev }: { ev: EventItem }) {
  const shortTitle = truncate(ev.title, 24);
  const hasView = typeof ev.viewCount === "number";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="block w-full text-left text-[11px] rounded px-1 py-0.5 bg-primary/10 hover:bg-primary/20">
          <div className="flex items-center justify-between gap-1">
            <span className="truncate">{shortTitle}</span>
            {hasView && (
              <span className="flex-shrink-0 text-[10px] text-muted-foreground">
                {ev.viewCount}
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-64 p-3 text-xs space-y-1"
      >
        <div className="text-[11px] uppercase text-muted-foreground">
          {ev.siteName}
        </div>
        <div className="font-semibold">{ev.title}</div>
        <div className="text-[11px] text-muted-foreground">
          예매 오픈: {formatDateTimeLabel(ev.openAt)}
        </div>
        {hasView && (
          <div className="text-[11px] text-muted-foreground">
            조회수: {ev.viewCount}회
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
