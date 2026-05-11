import { PrismaClient } from "./generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: pg.Pool;
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(currentDir, "../.env");

if (existsSync(envPath)) {
  loadEnv({ path: envPath });
}

const connectionString = process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error(`DATABASE_URL is not set. Expected it in ${envPath}`);
}

const pool = globalForPrisma.pool ?? new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter: adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.pool = pool;
}
