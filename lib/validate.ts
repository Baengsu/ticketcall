// 24.2 lib/validate.ts
import { z } from "zod";

export async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export function flattenZodError(err: z.ZodError) {
  const flat = err.flatten();
  return {
    formErrors: flat.formErrors,
    fieldErrors: flat.fieldErrors,
  };
}

