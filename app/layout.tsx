// C:\ticketcall\app\layout.tsx
// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "@/components/auth-provider";
import SiteHeader from "@/components/site-header";
import OnlineTracker from "@/components/online-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TicketForum",
  description: "공연 예매 오픈 캘린더 & 커뮤니티",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          {/* 🔥 모든 페이지에서 접속 상태를 서버에 주기적으로 알림 */}
          <OnlineTracker />
          <SiteHeader />
          {/* 페이지들이 이 안에 렌더링됨 */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
