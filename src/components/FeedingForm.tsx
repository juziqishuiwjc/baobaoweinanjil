"use client";

import { useState, useTransition } from "react";
import { addFeedingRecord } from "@/actions/feeding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FeedingForm() {
  const [amount, setAmount] = useState("");
  // useTransition 提供 isPending，用于按钮 loading 态 + 防止重复点击
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = Number(amount);
    // 基本校验：必须是有效的正数
    if (!Number.isFinite(value) || value <= 0) return;

    startTransition(async () => {
      await addFeedingRecord(value);
      setAmount(""); // 提交成功后清空输入框
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        step={1}
        placeholder="奶量(ml)"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        disabled={isPending}
        aria-label="奶量(毫升)"
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
  );
}
