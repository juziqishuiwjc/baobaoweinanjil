import {
  computeTodaySleepMs,
  formatDuration,
  getSleepPeriod,
  sleepPeriodLabel,
} from "@/lib/sleep";
import { formatFriendlyTime } from "@/lib/datetime";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SleepDeleteButton from "@/components/SleepDeleteButton";

/** 历史记录条目的最小数据结构（由 page.tsx 从查询结果中映射传入） */
export interface SleepHistoryItem {
  id: string;
  startTime: Date;
  /** null 表示这条睡眠还在进行中（计时未结束） */
  endTime: Date | null;
  /** 醒来体温（℃），未量则为 null */
  temperature: number | null;
}

/** 体温展示：固定一位小数（36.5 → "36.5℃"） */
function formatTemperature(temperature: number): string {
  return `🌡️ ${temperature.toFixed(1)}℃`;
}

/**
 * 睡眠历史列表（服务端组件）。
 *
 * UI 风格与喂奶历史保持一致：Card + 行式布局。
 * 每条展示：昼夜徽标（按入睡时间自动判断，不入库）+ 时间区间 + 时长 + 可选体温，
 * 顶部汇总「今日已睡」（跨午夜的长觉只计今天内的部分）。
 */
export default function SleepHistory({
  records,
}: {
  records: SleepHistoryItem[];
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          还没有睡眠记录，点「开始睡觉」后会显示在这里
        </CardContent>
      </Card>
    );
  }

  // 「今日已睡」在服务端按请求时计算（首页为 force-dynamic，每次刷新都是最新值）
  // 不足 1 分钟不展示，避免出现「今日已睡 0分钟」的奇怪观感
  const todaySleepMs = computeTodaySleepMs(
    records.map((record) => ({
      startTime: record.startTime,
      endTime: record.endTime,
    })),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>睡眠记录</CardTitle>
        {todaySleepMs >= 60_000 && (
          <p className="text-sm text-muted-foreground">
            今日已睡 {formatDuration(todaySleepMs)}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {records.map((record) => {
          const isActive = record.endTime === null;
          const durationMs =
            record.endTime === null
              ? null
              : record.endTime.getTime() - record.startTime.getTime();
          const period = getSleepPeriod(record.startTime);

          return (
            <div
              key={record.id}
              className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                {/* 第一行：昼夜徽标 + 体温 */}
                <span className="text-sm font-medium text-foreground/90">
                  {sleepPeriodLabel(period)}
                  {record.temperature !== null && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      {formatTemperature(record.temperature)}
                    </span>
                  )}
                </span>
                {/* 第二行：入睡 → 醒来 时间区间 */}
                <span className="truncate text-xs text-muted-foreground">
                  {formatFriendlyTime(record.startTime)}
                  {record.endTime !== null &&
                    ` → ${formatFriendlyTime(record.endTime)}`}
                </span>
              </div>

              <div className="flex shrink-0 items-center">
                {isActive ? (
                  <span className="text-sm font-semibold text-primary">
                    睡眠中…
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {durationMs !== null && formatDuration(durationMs)}
                  </span>
                )}
                <SleepDeleteButton id={record.id} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
