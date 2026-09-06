/**
 * datetime-local 输入框与时间展示的共享工具。
 *
 * 原先在 FeedingForm / DiaperForm 中各复制一份；2026-09-02 睡眠功能接入后
 * 统一提取到此处，三个表单组件共用，避免继续复制粘贴。
 */

/** 把 Date 格式化为 <input type="datetime-local"> 需要的 `YYYY-MM-DDTHH:MM` 字符串（本地时区） */
export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** 从 datetime-local 字符串解析为本地时区的 Date 对象 */
export function parseLocalInputValue(value: string): Date | null {
  // value 形如 "2026-08-15T14:30"
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    0,
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 把时间格式化为友好展示（服务端/客户端均可安全使用）：
 * - 今天 → "今天 14:30"
 * - 昨天 → "昨天 14:30"
 * - 更早 → "M月D日 14:30"
 *
 * 注意：仅在两端时区一致时结果一致（本项目部署与用户均在东八区，成立）。
 */
export function formatFriendlyTime(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfThat = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
  const diffDays = Math.round((startOfToday - startOfThat) / 86_400_000);

  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");

  if (diffDays === 0) return `今天 ${hh}:${mm}`;
  if (diffDays === 1) return `昨天 ${hh}:${mm}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hh}:${mm}`;
}
