/**
 * 喂奶统计纯函数（无副作用，双端通用）。
 *
 * 统计口径：以本地时间 0:00-24:00 为一天；
 * 未填奶量的记录仅在此处按 DEFAULT_AMOUNT_ML 估算计入，
 * 不改写数据库存储（历史列表仍显示「未记录奶量」）。
 */

/** 估算口径：未填奶量的记录按每次 150ml 计入（宝宝奶量增长后改这一处即可） */
export const DEFAULT_AMOUNT_ML = 150;

/** 统计所需的最小记录字段 */
export interface TodayFeedingRecord {
  time: Date;
  amount: number | null;
}

/** 今日统计结果 */
export interface TodayFeedingStats {
  /** 今日总奶量（毫升，含未填奶量的 150ml 估算） */
  totalMl: number;
  /** 今日喂奶次数 */
  count: number;
}

/**
 * 「今天 0 点」边界。
 *
 * 服务器与用户同在东八区，用本地时间构造安全（同 datetime.ts 的时区假设）。
 */
export function getStartOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * 汇总今日总奶量：amount 为 null 的记录按 DEFAULT_AMOUNT_ML 计入。
 *
 * @param records 今日（0 点起）的喂奶记录，通常来自 getTodayRecords()
 */
export function computeTodayMl(
  records: ReadonlyArray<TodayFeedingRecord>,
): TodayFeedingStats {
  let totalMl = 0;
  for (const record of records) {
    totalMl += record.amount ?? DEFAULT_AMOUNT_ML;
  }
  return { totalMl, count: records.length };
}
