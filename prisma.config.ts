// 19.1
// C:\ticketcall\prisma.config.ts

import dotenv from "dotenv";
import fs from "fs";
import { resolve } from "path";
import { defineConfig } from "prisma/config";

// Heuristics: treat as "production/railway" if these exist
const isRailway =
  !!process.env.RAILWAY_ENVIRONMENT ||
  !!process.env.RAILWAY_PROJECT_ID ||
  !!process.env.RAILWAY_SERVICE_ID ||
  (process.env.DATABASE_URL?.includes("railway") ?? false);

// Only load local env files when DATABASE_URL is missing AND we're not on Railway
if (!process.env.DATABASE_URL && !isRailway) {
  const envLocalPath = resolve(process.cwd(), ".env.local");
  const envPath = resolve(process.cwd(), ".env");

  if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath, override: false });
  } else if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: false });
  }
}

// Hard fail if still missing (prevents silent localhost fallbacks)
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Refusing to run Prisma with a fallback value. " +
      "Set DATABASE_URL in the environment (Railway Variables) or provide .env(.local) locally."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // IMPORTANT: use process.env directly (avoid prisma/config env() weirdness)
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
