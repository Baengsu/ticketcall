// 24.1 lib/env.ts
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXTAUTH_SECRET: z.string().min(1),
  REDIS_URL: z.string().optional(),
  NODE_ENV: z.string().optional(),
});

export const env = EnvSchema.parse(process.env);

