"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getStartOfToday } from "@/lib/feeding";

/**
 * 新增一条喂奶记录。
 *
 * @param amount 奶量（毫升，ml），可省略 / 为 null（仅记录时间、不记录奶量）
 * @param time   喂奶发生的时间；不传则取当前时间
 * @returns 创建后的记录
 */
export async function addFeedingRecord(amount?: number | null, time?: Date) {
  const record = await prisma.feedingRecord.create({
    data: {
      amount: amount ?? null,
      time: time ?? new Date(),
    },
  });

  // 刷新首页缓存，使倒计时 / 历史列表立即更新
  revalidatePath("/");

  return record;
}

/**
 * 获取最近的喂奶记录。
 *
 * 按 time 降序（最近的在前），最多返回 50 条。
 */
export async function getRecentRecords() {
  return prisma.feedingRecord.findMany({
    orderBy: { time: "desc" },
    take: 50,
  });
}

/**
 * 获取今日（本地时间 0 点起）的全部喂奶记录。
 *
 * 独立于 getRecentRecords（那里 take 50 只够历史列表），
 * 供「今日喝奶总量」统计使用；补记的时间也算今天的，语义正确。
 */
export async function getTodayRecords() {
  return prisma.feedingRecord.findMany({
    where: { time: { gte: getStartOfToday() } },
    orderBy: { time: "asc" },
  });
}
