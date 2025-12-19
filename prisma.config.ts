// Prisma 7+ seed configuration
// This replaces the "prisma.seed" field in package.json
// 
// IMPORTANT: Prisma CLI skips automatic env loading when prisma.config.ts is detected.
// We must explicitly load .env here for local/dev/CI environments.
// 
// Load order: .env.local (local dev) -> .env (fallback) -> process.env (production)
// This ensures local development uses .env.local, while production uses Railway env vars.
import { config } from "dotenv";
import { resolve } from "path";
import { defineConfig, env } from "prisma/config";

// Load .env.local first (local development, Next.js convention)
// Then load .env as fallback (if .env.local doesn't exist)
// Production (Railway) will use process.env directly
const envLocalPath = resolve(process.cwd(), ".env.local");
const envPath = resolve(process.cwd(), ".env");

// Load .env.local with override=true to ensure it takes precedence
if (require("fs").existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
} else {
  // Fallback to .env if .env.local doesn't exist
  config({ path: envPath, override: false });
}

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
