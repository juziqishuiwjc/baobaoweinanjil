"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";
import { addDiaperRecord, type DiaperType } from "@/actions/diaper";
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

/** 三个快捷按钮的配置（图标 + 文案 + 描述色） */
const QUICK_OPTIONS: ReadonlyArray<{
  type: DiaperType;
  emoji: string;
  label: string;
}> = [
  { type: "pee", emoji: "💦", label: "只有嘘嘘" },
  { type: "poop", emoji: "💩", label: "只有便便" },
  { type: "both", emoji: "🧻", label: "都有" },
];

/** 把 Date 格式化为 <input type="datetime-local"> 需要的 `YYYY-MM-DDTHH:MM` 字符串（本地时区） */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/** 从 datetime-local 字符串解析为本地时区的 Date 对象 */
function parseLocalInputValue(value: string): Date | null {
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

export default function DiaperForm() {
  // isPending 用于按钮 loading 态 + 防止重复点击（三个大按钮共享）
  const [isPending, startTransition] = useTransition();

  /** 快捷按钮：点击即以当前时间记录 */
  function handleQuickRecord(type: DiaperType) {
    if (isPending) return;
    startTransition(async () => {
      await addDiaperRecord(type);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 核心区域：三个大按钮，单手盲操友好 */}
      <div className="flex flex-col gap-3">
        {QUICK_OPTIONS.map((option) => (
          <button
            key={option.type}
            type="button"
            onClick={() => handleQuickRecord(option.type)}
            disabled={isPending}
            className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-2xl border bg-card text-lg font-semibold shadow-sm transition-colors hover:bg-accent active:scale-[0.99] disabled:pointer-events-none disabled:opacity-60"
          >
            <span aria-hidden className="text-2xl">
              {option.emoji}
            </span>
            {isPending ? "记录中…" : option.label}
          </button>
        ))}
      </div>

      {/* 次级入口：补记之前换尿布（轻量文字按钮，Dialog 内承载表单） */}
      <BackfillDialog disabled={isPending} />
    </div>
  );
}

/**
 * 「补记之前换尿布」弹窗
 * - 使用 Shadcn Dialog，与喂奶补记保持一致的交互模式
 * - datetime-local 默认值：1 小时前；最大值：当前（防止误选未来）
 * - 弹窗内先选状态再选时间，与主表单的三个状态一一对应
 */
function BackfillDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DiaperType>("pee");
  const [timeValue, setTimeValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 仅在 Dialog 打开时计算默认时间（客户端独占，不会有 hydration 问题）
  // 关闭后清空输入与错误，养成"清场"习惯避免下次打开看到旧值
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      setTimeValue(toLocalInputValue(oneHourAgo));
      setType("pee");
      setError(null);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const date = parseLocalInputValue(timeValue);
    if (date === null) {
      setError("请选择有效的换尿布时间");
      return;
    }
    if (date.getTime() > Date.now() + 60 * 1000) {
      // 允许 1 分钟的轻微时钟漂移
      setError("换尿布时间不能晚于现在");
      return;
    }

    startTransition(async () => {
      await addDiaperRecord(type, date);
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
          补记之前换尿布
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>补记之前换尿布</DialogTitle>
          <DialogDescription>
            为之前忘记记录的换尿布补一条记录（时间不能晚于现在）。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          {/* 状态选择：三个 pill 按钮（纯展示型选择，可用原生 button + Tailwind） */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              尿布状态
            </span>
            <div className="grid grid-cols-3 gap-2">
              {QUICK_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setType(option.type)}
                  aria-pressed={option.type === type}
                  className={
                    option.type === type
                      ? "flex flex-col items-center gap-0.5 rounded-xl border border-primary bg-primary/10 px-2 py-3 text-xs font-semibold text-primary"
                      : "flex flex-col items-center gap-0.5 rounded-xl border bg-muted/50 px-2 py-3 text-xs font-medium text-muted-foreground hover:bg-accent"
                  }
                >
                  <span aria-hidden className="text-lg">
                    {option.emoji}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              换尿布时间
            </span>
            <Input
              type="datetime-local"
              required
              value={timeValue}
              max={maxValue}
              onChange={(event) => setTimeValue(event.target.value)}
              disabled={isPending}
              aria-label="换尿布时间"
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
