import { computeTodayMl, DEFAULT_AMOUNT_ML } from "@/lib/feeding";
import type { TodayFeedingRecord } from "@/lib/feeding";
import { Card, CardContent } from "@/components/ui/card";

/**
 * 「今日喝奶」统计卡（服务端组件）。
 *
 * 数据在 page.tsx（force-dynamic）服务端算好传入，每次刷新即最新，
 * 不在客户端用 Date.now()，无 hydration 风险。
 */
export default function TodayFeedingStats({
  records,
}: {
  records: TodayFeedingRecord[];
}) {
  const { totalMl, count } = computeTodayMl(records);

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">今日喝奶</span>
          <span className="text-sm text-muted-foreground">
            {count > 0 ? `共 ${count} 次` : "还没有记录"}
          </span>
        </div>
        <span className="text-2xl font-semibold text-primary">
          {totalMl} ml
        </span>
        <span className="text-xs text-muted-foreground/70">
          周期：今天 0 点 – 24 点 · 未填奶量按 {DEFAULT_AMOUNT_ML} ml/次估算
        </span>
      </CardContent>
    </Card>
  );
}
