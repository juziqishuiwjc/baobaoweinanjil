"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** 换尿布状态：'pee' 嘘嘘 / 'poop' 便便 / 'both' 都有 */
export type DiaperType = "pee" | "poop" | "both";

const DIAPER_TYPES: readonly DiaperType[] = ["pee", "poop", "both"] as const;

/** 校验外部传入的 type 是否为合法的换尿布状态（类型收窄） */
function isDiaperType(value: string): value is DiaperType {
  return (DIAPER_TYPES as readonly string[]).includes(value);
}

/**
 * 新增一条换尿布记录。
 *
 * @param type 尿布状态：'pee' 嘘嘘 / 'poop' 便便 / 'both' 都有
 * @param time  换尿布发生的时间；不传则取当前时间
 * @returns 创建后的记录
 */
export async function addDiaperRecord(type: DiaperType, time?: Date) {
  // Server Action 的参数来自网络请求，即使前端是强类型也要在服务端兜底校验
  if (!isDiaperType(type)) {
    throw new Error(`无效的尿布状态: ${type}`);
  }

  const record = await prisma.diaperRecord.create({
    data: {
      type,
      time: time ?? new Date(),
    },
  });

  // 刷新首页缓存，使换尿布历史列表立即更新
  revalidatePath("/");

  return record;
}

/**
 * 获取最近的换尿布记录。
 *
 * 按 time 降序（最近的在前），最多返回 50 条（与喂奶历史保持一致）。
 */
export async function getDiaperRecords() {
  return prisma.diaperRecord.findMany({
    orderBy: { time: "desc" },
    take: 50,
  });
}
