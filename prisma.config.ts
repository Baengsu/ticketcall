// Prisma 7+ seed configuration
// This replaces the "prisma.seed" field in package.json
// 
// IMPORTANT: Prisma CLI skips automatic env loading when prisma.config.ts is detected.
// We must explicitly load .env here for local/dev/CI environments.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // env("DATABASE_URL") reads from process.env, which is populated by dotenv/config above
    // This works both locally (.env file) and on Railway (environment variables)
    url: env("DATABASE_URL"),
  },
});
