"use client";

import { useState, useTransition } from "react";
import { History } from "lucide-react";
import { addFeedingRecord } from "@/actions/feeding";
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
// datetime-local 格式化/解析工具已提取到 lib/datetime 共享（喂奶/睡眠表单共用）
import {
  parseLocalInputValue,
  toLocalInputValue,
} from "@/lib/datetime";

export default function FeedingForm() {
  const [amount, setAmount] = useState("");
  // useTransition 提供 isPending，用于按钮 loading 态 + 防止重复点击
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = amount.trim();

    // 奶量非必填：空输入 → 记录一条无奶量的喂奶（amount = null）
    if (trimmed === "") {
      startTransition(async () => {
        await addFeedingRecord(null);
        setAmount(""); // 提交成功后清空输入框
      });
      return;
    }

    const value = Number(trimmed);
    // 有输入但无效（非数字 / 0 / 负数）：阻止提交
    if (!Number.isFinite(value) || value <= 0) return;

    startTransition(async () => {
      await addFeedingRecord(value);
      setAmount(""); // 提交成功后清空输入框
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 主表单：记录现在 */}
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          placeholder="奶量(ml)，可不填"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={isPending}
          aria-label="奶量(毫升)，可不填"
          className="h-12 text-base"
        />
        <Button
          type="submit"
          size="lg"
          disabled={isPending}
          className="h-14 w-full text-lg font-semibold"
        >
          {isPending ? "记录中…" : "记录本次喂奶"}
        </Button>
      </form>

      {/* 次级入口：补记之前喂奶（轻量文字按钮，Dialog 内承载表单） */}
      <BackfillDialog disabled={isPending} />
    </div>
  );
}

/**
 * 「补记之前喂奶」弹窗
 * - 使用 Shadcn Dialog，体积小、关闭后不污染主表单
 * - datetime-local 默认值：1 小时前；最大值：当前（防止误选未来）
 * - 时间/奶量校验：必填时间、可选奶量（与主表单规则一致）
 */
function BackfillDialog({ disabled }: { disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [timeValue, setTimeValue] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // 仅在 Dialog 打开时计算默认时间（客户端独占，不会有 hydration 问题）
  // 关闭后清空输入与错误，养成"清场"习惯避免下次打开看到旧值
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      setTimeValue(toLocalInputValue(oneHourAgo));
      setAmount("");
      setError(null);
    }
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const date = parseLocalInputValue(timeValue);
    if (date === null) {
      setError("请选择有效的喂奶时间");
      return;
    }
    if (date.getTime() > Date.now() + 60 * 1000) {
      // 允许 1 分钟的轻微时钟漂移
      setError("喂奶时间不能晚于现在");
      return;
    }

    const trimmed = amount.trim();
    let amountValue: number | null = null;
    if (trimmed !== "") {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        setError("奶量必须是正数");
        return;
      }
      amountValue = parsed;
    }

    startTransition(async () => {
      await addFeedingRecord(amountValue, date);
      // 提交成功：关闭弹窗 + 清空（handleOpenChange 会重置状态）
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
          补记之前喂奶
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>补记之前喂奶</DialogTitle>
          <DialogDescription>
            为之前忘记记录的喂奶补一条记录（时间不能晚于现在）。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              喂奶时间
            </span>
            <Input
              type="datetime-local"
              required
              value={timeValue}
              max={maxValue}
              onChange={(event) => setTimeValue(event.target.value)}
              disabled={isPending}
              aria-label="喂奶时间"
              className="h-11 text-base"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              奶量（ml，可不填）
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              placeholder="不填则仅记录时间"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              disabled={isPending}
              aria-label="奶量（毫升），可不填"
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