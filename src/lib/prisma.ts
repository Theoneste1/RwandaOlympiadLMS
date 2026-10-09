import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

/**
 * Netlify Functions ship a read-only filesystem (only /tmp is writable). The bundled
 * SQLite file (shipped via next.config.ts's outputFileTracingIncludes) can't be opened
 * in place, so copy it into /tmp once per cold start and point Prisma there instead.
 */
function resolveDatabaseUrl(): string | undefined {
  if (process.env.NODE_ENV !== "production") return process.env.DATABASE_URL;

  const tmpDbPath = "/tmp/dev.db";
  try {
    if (!fs.existsSync(tmpDbPath)) {
      const bundledDbPath = path.join(process.cwd(), "prisma", "prisma", "dev.db");
      if (fs.existsSync(bundledDbPath)) fs.copyFileSync(bundledDbPath, tmpDbPath);
    }
    if (fs.existsSync(tmpDbPath)) return `file:${tmpDbPath}`;
  } catch {
    // Fall through to whatever DATABASE_URL is already set.
  }
  return process.env.DATABASE_URL;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ datasources: { db: { url: resolveDatabaseUrl() } } });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
