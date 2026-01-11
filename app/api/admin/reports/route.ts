/**
 * 관리자 신고 목록 조회 API
 * GET /api/admin/reports
 * 
 * 관리자만 신고 목록을 조회할 수 있습니다.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. 세션 및 관리자 권한 확인
    const gate = await requireAdmin();
    if (!gate.ok) {
      return NextResponse.json(
        { error: gate.status === 401 ? "Unauthorized" : "Forbidden" },
        { status: gate.status }
      );
    }

    // 2. 쿼리 파라미터 파싱
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status"); // "pending", "resolved", "ignored"
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    // 3. 신고 목록 조회
    const where: any = {};
    if (status && ["pending", "resolved", "ignored"].includes(status)) {
      where.status = status;
    }

    const [reports, total] = await Promise.all([
      prisma.report.findMany({
        where,
        include: {
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.report.count({ where }),
    ]);

    // 4. 타겟 정보 조회 (게시물 또는 댓글)
    const reportsWithTargets = await Promise.all(
      reports.map(async (report) => {
        let targetInfo: any = null;

        if (report.targetType === "POST") {
          const post = await prisma.post.findUnique({
            where: { id: report.targetId },
            select: {
              id: true,
              title: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });
          targetInfo = post
            ? {
                id: post.id,
                title: post.title,
                author: post.author,
              }
            : null;
        } else if (report.targetType === "COMMENT") {
          const comment = await prisma.comment.findUnique({
            where: { id: report.targetId },
            select: {
              id: true,
              content: true,
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              post: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          });
          targetInfo = comment
            ? {
                id: comment.id,
                content: comment.content.substring(0, 100) + (comment.content.length > 100 ? "..." : ""),
                author: comment.author,
                post: comment.post,
              }
            : null;
        }

        return {
          id: report.id,
          createdAt: report.createdAt.toISOString(),
          status: report.status,
          reason: report.reason,
          targetType: report.targetType,
          targetId: report.targetId,
          targetInfo,
          reporter: report.reporter,
        };
      })
    );

    return NextResponse.json(
      {
        ok: true,
        reports: reportsWithTargets,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[Admin Reports] Error:", err);
    return NextResponse.json(
      { ok: false, message: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

