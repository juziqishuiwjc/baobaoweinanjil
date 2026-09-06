"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/** 体温合理区间（℃）：低于 30 或高于 45 视为误输入 */
const TEMPERATURE_MIN = 30;
const TEMPERATURE_MAX = 45;
/** 允许的时钟漂移（毫秒）：校验「不能晚于现在」时放宽 1 分钟 */
const CLOCK_DRIFT_TOLERANCE_MS = 60 * 1000;

/**
 * 校验体温输入：空 → null；超出合理区间抛错。
 * Server Action 参数来自网络请求，前端强类型也要在服务端兜底。
 */
function parseTemperature(temperature?: number | null): number | null {
  if (temperature == null) return null;
  if (
    !Number.isFinite(temperature) ||
    temperature < TEMPERATURE_MIN ||
    temperature > TEMPERATURE_MAX
  ) {
    throw new Error(
      `体温超出合理范围（${TEMPERATURE_MIN}-${TEMPERATURE_MAX}℃）：${temperature}`,
    );
  }
  return temperature;
}

/**
 * 查询当前进行中的睡眠（endTime 为 null），没有则返回 null。
 *
 * 由首页服务端组件调用，用于渲染 SleepTracker 的「睡眠中」状态。
 */
export async function getActiveSleep() {
  return prisma.sleepRecord.findFirst({
    where: { endTime: null },
    orderBy: { startTime: "desc" },
  });
}

/**
 * 开始睡觉：创建一条进行中的睡眠记录（endTime 为 null）。
 *
 * 同一时间只允许一条进行中的记录；已存在时抛错（正常 UI 下不会出现，
 * 双端同时点击等边界由服务端兜底）。
 *
 * @param time 入睡时间；不传则取当前时间
 */
export async function startSleep(time?: Date) {
  const existing = await getActiveSleep();
  if (existing !== null) {
    throw new Error("已有进行中的睡眠记录，请先「醒来」或取消后再开始");
  }

  const record = await prisma.sleepRecord.create({
    data: { startTime: time ?? new Date() },
  });

  // 刷新首页缓存，使睡眠计时卡片 / 历史列表立即更新
  revalidatePath("/");

  return record;
}

/**
 * 醒来：结束进行中的睡眠，写入醒来时间（当前时刻），可附体温。
 *
 * @param temperature 醒来时量的体温（℃），可省略 / 为 null
 */
export async function endSleep(temperature?: number | null) {
  const active = await getActiveSleep();
  if (active === null) {
    throw new Error("当前没有进行中的睡眠记录");
  }

  const record = await prisma.sleepRecord.update({
    where: { id: active.id },
    data: {
      endTime: new Date(),
      temperature: parseTemperature(temperature),
    },
  });

  revalidatePath("/");

  return record;
}

/**
 * 取消进行中的睡眠：直接删除记录（用于误触「开始睡觉」的撤回）。
 */
export async function cancelSleep() {
  const active = await getActiveSleep();
  if (active === null) {
    throw new Error("当前没有进行中的睡眠记录");
  }

  await prisma.sleepRecord.delete({ where: { id: active.id } });

  revalidatePath("/");
}

/**
 * 补录一条完整的睡眠记录（入睡 → 醒来），供「补记之前睡觉」使用。
 *
 * @param startTime   入睡时间
 * @param endTime     醒来时间，必须晚于入睡时间且不能晚于现在
 * @param temperature 醒来时量的体温（℃），可省略 / 为 null
 */
export async function addSleepRecord(
  startTime: Date,
  endTime: Date,
  temperature?: number | null,
) {
  if (endTime.getTime() <= startTime.getTime()) {
    throw new Error("醒来时间必须晚于入睡时间");
  }
  if (endTime.getTime() > Date.now() + CLOCK_DRIFT_TOLERANCE_MS) {
    throw new Error("醒来时间不能晚于现在");
  }

  const record = await prisma.sleepRecord.create({
    data: {
      startTime,
      endTime,
      temperature: parseTemperature(temperature),
    },
  });

  revalidatePath("/");

  return record;
}

/**
 * 删除一条睡眠记录（历史列表的删除按钮，调用前由前端二次确认）。
 *
 * 记录不存在时静默返回（幂等，避免并发下二次删除报错）。
 */
export async function deleteSleepRecord(id: string) {
  const existing = await prisma.sleepRecord.findUnique({ where: { id } });
  if (existing === null) return;

  await prisma.sleepRecord.delete({ where: { id } });

  revalidatePath("/");
}

/**
 * 获取最近的睡眠记录。
 *
 * 按 startTime 降序（最近的在前），最多返回 50 条（与喂奶历史保持一致）。
 */
export async function getSleepRecords() {
  return prisma.sleepRecord.findMany({
    orderBy: { startTime: "desc" },
    take: 50,
  });
}
