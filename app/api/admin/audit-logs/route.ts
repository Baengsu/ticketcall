// 25.4.2 app/api/admin/audit-logs/route.ts
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ok, fail } from "@/lib/api-response";
import { z } from "zod";
import { parseSearchParams } from "@/lib/zod-shared";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(20).max(200).optional().default(50),
});

export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (!gate.ok) return fail(gate.status === 401 ? "Unauthorized" : "Forbidden", gate.status);

  const q = parseSearchParams(req);
  const parsed = QuerySchema.safeParse(q);
  if (!parsed.success) return fail("Invalid query", 400);

  const { limit } = parsed.data;

  const items = await prisma.adminActionLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { actor: { select: { id: true, username: true, nickname: true, role: true } } } as any,
  });

  return ok({ items, limit });
}

