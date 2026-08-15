import Image from "next/image";
import { getRecentRecords } from "@/actions/feeding";
import { getDiaperRecords } from "@/actions/diaper";
import FeedingTimer from "@/components/FeedingTimer";
import FeedingForm from "@/components/FeedingForm";
import DiaperForm from "@/components/DiaperForm";
import DiaperHistory from "@/components/DiaperHistory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// 首页依赖数据库查询（喂养/换尿布记录），构建时不可预渲染。
// 强制按请求时动态渲染，跳过 build 阶段的静态预生成。
export const dynamic = "force-dynamic";

/**
 * 把时间格式化为友好展示：
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
  // 两个列表数据相互独立，可并发查询
  const [records, diaperRecords] = await Promise.all([
    getRecentRecords(),
    getDiaperRecords(),
  ]);
  const latestRecord = records[0] ?? null;

  return (
    <main className="flex min-h-screen w-full justify-center bg-muted/40">
      {/* 手机壳容器：移动端铺满；桌面端居中、max-w-md、圆角 + 软阴影 */}
      <div className="flex w-full max-w-md flex-col gap-6 bg-background px-5 py-8 shadow-lg shadow-primary/5 ring-1 ring-black/5 sm:my-4 sm:min-h-[calc(100vh-2rem)] sm:rounded-2xl">
        {/* Header（含宝宝头像） */}
        <header className="flex flex-col items-center gap-1 text-center">
          <Image
            src="/avatar.jpg"
            alt="书熠"
            width={64}
            height={64}
            className="mb-2 h-16 w-16 rounded-full border-2 border-primary/20 object-cover shadow-sm"
          />
          <h1 className="text-2xl font-semibold tracking-tight">书熠的喂养记录</h1>
          <p className="text-sm text-muted-foreground">配方奶喂养 · 间隔可调</p>
        </header>

        {/* 顶部 Tabs：喂奶 / 换尿布 两大功能切换，两组件树互不影响 */}
        <Tabs defaultValue="feeding" className="gap-4">
          <TabsList className="grid h-12 w-full grid-cols-2">
            <TabsTrigger value="feeding" className="text-base">
              🍼 喂奶
            </TabsTrigger>
            <TabsTrigger value="diaper" className="text-base">
              🧷 换尿布
            </TabsTrigger>
          </TabsList>

          {/* Tab 1：喂奶（原有功能原样迁移） */}
          <TabsContent value="feeding" className="flex flex-col gap-6">
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
                          {record.amount != null
                            ? `${record.amount} ml`
                            : "未记录奶量"}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>
          </TabsContent>

          {/* Tab 2：换尿布（新功能） */}
          <TabsContent value="diaper" className="flex flex-col gap-6">
            {/* 快速记录（三大状态按钮 + 补记入口） */}
            <DiaperForm />

            {/* 历史记录（独立列表，与喂奶历史完全隔离） */}
            <section className="flex flex-col gap-3">
              <DiaperHistory records={diaperRecords} />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
