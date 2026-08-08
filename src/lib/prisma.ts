import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

/**
 * Prisma Client 全局单例。
 *
 * Next.js 开发环境下热更新（HMR）会反复重新加载模块，若每次都 new 一个
 * PrismaClient，会不断新建数据库连接最终耗尽。因此把实例挂到 globalThis 上复用。
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  // Prisma 7 对 SQL 数据源强制要求 driver adapter；SQLite 用 better-sqlite3。
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
