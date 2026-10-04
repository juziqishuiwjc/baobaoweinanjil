import Image from "next/image";
import { getRecentRecords, getTodayRecords } from "@/actions/feeding";
import { getPhotos } from "@/actions/photo";
import FeedingTimer from "@/components/FeedingTimer";
import FeedingForm from "@/components/FeedingForm";
import TodayFeedingStats from "@/components/TodayFeedingStats";
import PhotoUploader from "@/components/PhotoUploader";
import PhotoGrid from "@/components/PhotoGrid";
import { formatFriendlyTime } from "@/lib/datetime";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// 首页依赖数据库查询（喂养记录/今日统计/照片），构建时不可预渲染。
// 强制按请求时动态渲染，跳过 build 阶段的静态预生成。
export const dynamic = "force-dynamic";

export default async function Home() {
  // 三组数据相互独立，可并发查询（今日统计按 0 点起算，历史列表取最近 50 条）
  const [records, todayRecords, photos] = await Promise.all([
    getRecentRecords(),
    getTodayRecords(),
    getPhotos(),
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
          <p className="text-sm text-muted-foreground">配方奶喂养 · 成长相册</p>
        </header>

        {/* 顶部 Tabs：喂奶 / 相册 两大功能切换，两组件树互不影响 */}
        <Tabs defaultValue="feeding" className="gap-4">
          <TabsList className="grid h-12 w-full grid-cols-2">
            <TabsTrigger value="feeding" className="text-base">
              🍼 喂奶
            </TabsTrigger>
            <TabsTrigger value="photos" className="text-base">
              📷 相册
            </TabsTrigger>
          </TabsList>

          {/* Tab 1：喂奶（计时 + 今日统计 + 记录 + 历史） */}
          <TabsContent value="feeding" className="flex flex-col gap-6">
            {/* 倒计时表盘 */}
            <FeedingTimer lastFeedTime={latestRecord?.time ?? null} />

            {/* 今日喝奶总量统计（0-24 点为一天，未填奶量按 150ml 计） */}
            <TodayFeedingStats records={todayRecords} />

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
                          {formatFriendlyTime(record.time)}
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

          {/* Tab 2：成长相册（上传 + 网格浏览 + 查看大图/删除） */}
          <TabsContent value="photos" className="flex flex-col gap-4">
            {/* 上传入口（选择即压缩预览，确认后入库） */}
            <PhotoUploader />

            {/* 照片网格（最近 60 张，缩略图加载；空态给引导文案） */}
            {photos.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  还没有照片，上传第一张宝宝照片吧
                </CardContent>
              </Card>
            ) : (
              <PhotoGrid photos={photos} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
