"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * 新增一条喂奶记录。
 *
 * @param amount 奶量（毫升，ml）
 * @param time   喂奶发生的时间；不传则取当前时间
 * @returns 创建后的记录
 */
export async function addFeedingRecord(amount: number, time?: Date) {
  const record = await prisma.feedingRecord.create({
    data: {
      amount,
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
