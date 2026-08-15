import type { DiaperType } from "@/actions/diaper";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** 历史记录条目的最小数据结构（由 page.tsx 从查询结果中映射传入） */
export interface DiaperHistoryItem {
  id: string;
  type: string;
  time: Date;
}

/** 各状态对应的展示文案（未知值兜底为原文） */
function diaperTypeLabel(type: string): string {
  const labels: Record<DiaperType, string> = {
    pee: "💦 嘘嘘",
    poop: "💩 便便",
    both: "🧻 都有",
  };
  return type in labels ? labels[type as DiaperType] : type;
}

/**
 * 把换尿布时间格式化为友好展示：
 * - 今天 → "今天 14:30"
 * - 昨天 → "昨天 14:30"
 * - 更早 → "M月D日 14:30"
 */
function formatDiaperTime(date: Date): string {
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

/**
 * 换尿布历史列表（服务端组件）。
 *
 * UI 风格与喂奶历史保持一致：Card + 左时间右状态的行式布局。
 */
export default function DiaperHistory({
  records,
}: {
  records: DiaperHistoryItem[];
}) {
  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          还没有换尿布记录，第一次记录后会显示在这里
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>换尿布记录</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
          >
            <span className="text-sm text-foreground/90">
              {formatDiaperTime(record.time)}
            </span>
            <span className="text-sm font-semibold text-primary">
              {diaperTypeLabel(record.type)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
