// C:\ticketcall\components\online-tracker.tsx
"use client";

import { useEffect } from "react";

export default function OnlineTracker() {
  useEffect(() => {
    const ping = async () => {
      try {
        await fetch("/api/ping", {
          method: "POST",
        });
      } catch (error) {
        // 네트워크 에러 등은 조용히 무시
        console.error("Failed to ping /api/ping", error);
      }
    };

    // 최초 진입 시 한 번
    ping();

    // 15초마다 서버에 "나 접속중" 이라고 알림
    const interval = setInterval(ping, 15000);
    return () => clearInterval(interval);
  }, []);

  // UI에 아무것도 렌더링하지 않음
  return null;
}
