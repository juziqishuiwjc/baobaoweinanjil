"use client";

import { useEffect, useState, useTransition } from "react";
import { History } from "lucide-react";
import {
  addSleepRecord,
  cancelSleep,
  endSleep,
  startSleep,
} from "@/actions/sleep";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  formatFriendlyTime,
  parseLocalInputValue,
  toLocalInputValue,
} from "@/lib/datetime";

/** page.tsx 传入的「进行中睡眠」最小结构（endTime 恒为 null，无需传递） */
export interface ActiveSleepInfo {
  id: string;
  startTime: Date;
}

/** 体温合理区间（℃），与服务端 actions/sleep.ts 保持一致 */
const TEMP_MIN = 30;
const TEMP_MAX = 45;

/**
 * 把已睡时长格式化为带秒的实时展示（仅计时卡片使用，历史记录用 formatDuration）：
 * - 1小时23分45秒 / 23分45秒
 */
function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}小时${m}分${s}秒`;
  return `${m}分${s}秒`;
}

/**
 * 解析体温输入：空字符串 → null（未量）；非法值 → undefined（由调用方提示）。
 */
function parseTemperatureInput(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < TEMP_MIN || value > TEMP_MAX) {
    return undefined;
  }
  return value;
}

/**
 * 睡眠记录卡片（客户端组件）。
 *
 * - 未在睡：大按钮「开始睡觉」（单手盲操规格 h-20）
 * - 睡眠中：实时计时（hydration 安全：now 用 null 占位，挂载后再更新）
 *          + 可选体温输入 +「醒来了」/「取消」
 * - 两种状态下都可「补记之前睡觉」
 */
export default function SleepTracker({
  activeSleep,
}: {
  activeSleep: ActiveSleepInfo | null;
}) {
  // isPending 用于按钮 loading 态 + 防止重复点击（开始/结束/取消共享）
  const [isPending, startTransition] = useTransition();

  // now 用 null 占位：避免 SSR 与客户端 Date.now() 不一致导致 hydration 报错
  //（模式同 FeedingTimer.tsx）。挂载后立即 + 每秒更新，驱动实时计时。
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // 首帧用 setTimeout 异步赋值（同步 setState 会触发级联渲染的 lint 报错），
    // 计时文案在挂载后的下一帧即从占位符刷新为真实时长
    const timeout = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(id);
    };
  }, []);

  /** 睡眠中可预先填写的醒来体温（选填） */
  const [temperature, setTemperature] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** 开始睡觉：以当前时间创建进行中的记录 */
  function handleStart() {
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      await startSleep();
    });
  }

  /** 醒来：结束计时，附上（可选）体温 */
  function handleEnd() {
    if (isPending) return;
    setError(null);

    const temp = parseTemperatureInput(temperature);
    if (temp === undefined) {
      setError(`体温需在 ${TEMP_MIN}-${TEMP_MAX}℃ 之间，或留空不填`);
      return;
    }

    startTransition(async () => {
      await endSleep(temp);
      // 提交成功后清空输入，避免下次睡眠看到旧体温
      setTemperature("");
    });
  }

  /** 取消误触的开始：二次确认后删除进行中的记录 */
  function handleCancel() {
    if (isPending) return;
    if (!window.confirm("确定取消本次睡眠计时吗？这条记录将被删除。")) return;

    setError(null);
    startTransition(async () => {
      await cancelSleep();
      setTemperature("");
    });
  }

  // ---------- 状态一：未在睡 ----------
  if (!activeSleep) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleStart}
          disabled={isPending}
          className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border bg-card text-lg font-semibold shadow-sm transition-colors hover:bg-accent active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
        >
          <span aria-hidden className="text-2xl">
            😴
          </span>
          {isPending ? "开始中…" : "开始睡觉"}
        </button>
        <BackfillDialog disabled={isPending} />
      </div>
    );
  }

  // ---------- 状态二：睡眠中 ----------
  const startMs = new Date(activeSleep.startTime).getTime();
  const elapsedMs = now === null ? null : Math.max(0, now - startMs);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-2xl border bg-card px-6 py-6 text-center shadow-sm">
        {/* 实时已睡时长 */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">宝宝已睡</span>
          <span
            aria-live="off"
            className="text-4xl font-bold tabular-nums tracking-tight text-primary"
          >
            {elapsedMs === null ? (
              <span className="text-muted-foreground/40">--分--秒</span>
            ) : (
              formatElapsed(elapsedMs)
            )}
          </span>
          <span className="text-xs text-muted-foreground">
            入睡时间 {formatFriendlyTime(activeSleep.startTime)}
          </span>
        </div>

        <div className="h-px w-full bg-border" />

        {/* 醒来体温（选填，醒来时一起保存） */}
        <div className="flex flex-col gap-2">
          <Input
            type="number"
            inputMode="decimal"
            min={TEMP_MIN}
            max={TEMP_MAX}
            step={0.1}
            placeholder="醒来体温(℃)，可不填"
            value={temperature}
            onChange={(event) => setTemperature(event.target.value)}
            disabled={isPending}
            aria-label="醒来体温（摄氏度），可不填"
            className="h-12 text-base"
          />
          {error !== null && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        {/* 醒来：结束计时并保存 */}
        <Button
          type="button"
          size="lg"
          onClick={handleEnd}
          disabled={isPending}
          className="h-14 w-full text-lg font-semibold"
        >
          {isPending ? "保存中…" : "☀️ 醒来了"}
        </Button>

        {/* 误触撤回 */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          disabled={isPending}
          className="text-muted-foreground hover:text-foreground"
        >
          记错了，取消本次计时
        </Button>
      </div>

      <BackfillDialog disabled={isPending} />
    </div>
  );
}

/**
 * 「补记之前睡觉」弹窗
 * - 使用 Shadcn Dialog，与喂奶补记保持一致的交互模式
 * - 入睡时间默认 1 小时前、醒来时间默认当前；最大值均为当前（防止误选未来）
 * - 校验：醒来时间必须晚于入睡时间
 */
function BackfillDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [startTimeValue, setStartTimeValue] = useState<string>("");
  const [endTimeValue, setEndTimeValue] = useState<string>("");
  const [temperature, setTemperature] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 仅在 Dialog 打开时计算默认时间（客户端独占，不会有 hydration 问题）
  // 关闭后清空输入与错误，养成"清场"习惯避免下次打开看到旧值
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      setStartTimeValue(toLocalInputValue(oneHourAgo));
      setEndTimeValue(toLocalInputValue(new Date()));
      setTemperature("");
      setError(null);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const startTime = parseLocalInputValue(startTimeValue);
    const endTime = parseLocalInputValue(endTimeValue);
    if (startTime === null || endTime === null) {
      setError("请选择有效的入睡和醒来时间");
      return;
    }
    if (endTime.getTime() <= startTime.getTime()) {
      setError("醒来时间必须晚于入睡时间");
      return;
    }
    if (endTime.getTime() > Date.now() + 60 * 1000) {
      // 允许 1 分钟的轻微时钟漂移
      setError("醒来时间不能晚于现在");
      return;
    }

    const temp = parseTemperatureInput(temperature);
    if (temp === undefined) {
      setError(`体温需在 ${TEMP_MIN}-${TEMP_MAX}℃ 之间，或留空不填`);
      return;
    }

    startTransition(async () => {
      await addSleepRecord(startTime, endTime, temp);
      // 提交成功：关闭弹窗（handleOpenChange 会重置状态）
      setOpen(false);
    });
  }

  // 当前时间的 datetime-local 字符串，用作 max 属性（防止选未来）
  const maxValue = toLocalInputValue(new Date());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          className="text-muted-foreground hover:text-foreground"
        >
          <History aria-hidden className="size-4" />
          补记之前睡觉
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>补记之前睡觉</DialogTitle>
          <DialogDescription>
            为之前忘记记录的睡眠补一条记录（时间不能晚于现在）。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              入睡时间
            </span>
            <Input
              type="datetime-local"
              required
              value={startTimeValue}
              max={maxValue}
              onChange={(event) => setStartTimeValue(event.target.value)}
              disabled={isPending}
              aria-label="入睡时间"
              className="h-11 text-base"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              醒来时间
            </span>
            <Input
              type="datetime-local"
              required
              value={endTimeValue}
              max={maxValue}
              onChange={(event) => setEndTimeValue(event.target.value)}
              disabled={isPending}
              aria-label="醒来时间"
              className="h-11 text-base"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              醒来体温（℃，可不填）
            </span>
            <Input
              type="number"
              inputMode="decimal"
              min={TEMP_MIN}
              max={TEMP_MAX}
              step={0.1}
              placeholder="不填则不记录体温"
              value={temperature}
              onChange={(event) => setTemperature(event.target.value)}
              disabled={isPending}
              aria-label="醒来体温（摄氏度），可不填"
              className="h-11 text-base"
            />
          </label>
          {error !== null && (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter showCloseButton className="-mx-4 -mb-4 mt-2">
            <Button
              type="submit"
              size="lg"
              disabled={isPending}
              className="h-12 w-full text-base font-semibold sm:w-auto"
            >
              {isPending ? "保存中…" : "保存补记"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
