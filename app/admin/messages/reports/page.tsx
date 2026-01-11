/**
 * 관리자 메시지 신고 페이지 래퍼
 * 
 * 서버 사이드 권한 체크를 수행합니다.
 */

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminMessageReportsPage from "./page-client";

export default async function AdminMessageReportsPageWrapper() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any | undefined;

  // 관리자만 접근 가능 (서버 사이드 체크)
  if (!user || user.role !== "admin") {
    redirect("/");
  }

  return <AdminMessageReportsPage />;
}
