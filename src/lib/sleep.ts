/**
 * 睡眠记录的纯计算工具（无副作用，服务端 / 客户端通用）。
 *
 * 昼夜判断不入库：由入睡时间实时计算，调整边界无需迁移数据。
 */

/** 夜间时段：入睡时间在 20:00 及以后，或次日 7:00 之前 */
const NIGHT_START_HOUR = 20;
const NIGHT_END_HOUR = 7;

/** 睡眠时段：'day' 白天小睡 / 'night' 夜间睡眠 */
export type SleepPeriod = "day" | "night";

/** 单条睡眠的时间区间（endTime 为 null 的进行中记录由调用方决定如何截断） */
export interface SleepInterval {
  startTime: Date;
  endTime: Date | null;
}

/**
 * 按入睡时间判断白天小睡 / 夜间睡眠。
 * 夜间 = 入睡时刻在 20:00–次日 7:00 之间，其余为白天小睡。
 */
export function getSleepPeriod(startTime: Date): SleepPeriod {
  const hour = startTime.getHours();
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR ? "night" : "day";
}

/** 昼夜徽标文案 */
export function sleepPeriodLabel(period: SleepPeriod): string {
  return period === "night" ? "🌙 夜间" : "☀️ 白天";
}

/**
 * 把一段时长格式化为中文展示：
 * - 不足 1 小时 → "45分钟"
 * - 1 小时及以上 → "1小时23分"（秒位不展示，历史记录无需秒级精度）
 */
export function formatDuration(durationMs: number): string {
  const totalMinutes = Math.max(0, Math.floor(durationMs / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}分钟`;
  return `${h}小时${m}分`;
}

/**
 * 计算「今日已睡总时长」（毫秒）。
 *
 * 把每段睡眠与 [今天 00:00, 当前时刻] 求交集后累加：
 * - 跨午夜的长觉只计落在今天内的部分；
 * - 进行中的记录（endTime 为 null）按当前时刻截断；
 * - 今天 00:00 之前已结束的睡眠不计入。
 */
export function computeTodaySleepMs(
  records: ReadonlyArray<SleepInterval>,
  now: Date = new Date(),
): number {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const nowMs = now.getTime();

  let totalMs = 0;
  for (const record of records) {
    const start = record.startTime.getTime();
    const end = (record.endTime ?? now).getTime();
    const overlapStart = Math.max(start, startOfToday);
    const overlapEnd = Math.min(end, nowMs);
    if (overlapEnd > overlapStart) {
      totalMs += overlapEnd - overlapStart;
    }
  }
  return totalMs;
}
