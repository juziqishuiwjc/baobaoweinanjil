import { getRecentRecords } from "@/actions/feeding";
import FeedingTimer from "@/components/FeedingTimer";
import FeedingForm from "@/components/FeedingForm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * 把喂奶时间格式化为友好展示：
 * - 今天 → "今天 14:30"
 * - 昨天 → "昨天 14:30"
 * - 更早 → "M月D日 14:30"
 */
function formatFeedTime(date: Date): string {
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

export default async function Home() {
  const records = await getRecentRecords();
  const latestRecord = records[0] ?? null;

  return (
    <main className="flex min-h-screen w-full justify-center bg-muted/40">
      {/* 手机壳容器：移动端铺满；桌面端居中、max-w-md、圆角 + 软阴影 */}
      <div className="flex w-full max-w-md flex-col gap-6 bg-background px-5 py-8 shadow-lg shadow-primary/5 ring-1 ring-black/5 sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-2xl">
        {/* Header */}
        <header className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">书熠的喂奶记录</h1>
          <p className="text-sm text-muted-foreground">配方奶 · 约每 2 小时一次</p>
        </header>

        {/* 倒计时表盘 */}
        <FeedingTimer lastFeedTime={latestRecord?.time ?? null} />

        {/* 快速记录 */}
        <FeedingForm />

        {/* 历史记录 */}
        <section className="flex flex-col gap-3">
          {records.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                还没有记录，喂第一次奶后会显示在这里
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>历史记录</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm text-foreground/90">
                      {formatFeedTime(record.time)}
                    </span>
                    <span className="text-sm font-semibold text-primary">
                      {record.amount} ml
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
