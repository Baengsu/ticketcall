// 25.2 lib/zod-shared.ts
import { z } from "zod";

export const zId = z.coerce.number().int().positive();
export const zVoteValue = z.coerce.number().int().refine((v) => v === 1 || v === -1);

export const zPagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(5).max(50).default(20),
});

export function parseSearchParams(req: Request) {
  const { searchParams } = new URL(req.url);
  const obj: Record<string, string> = {};
  for (const [k, v] of searchParams.entries()) obj[k] = v;
  return obj;
}

