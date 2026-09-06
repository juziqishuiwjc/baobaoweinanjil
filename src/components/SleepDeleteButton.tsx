"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteSleepRecord } from "@/actions/sleep";

/**
 * 睡眠记录的删除按钮（客户端组件）。
 *
 * 点击后 window.confirm 二次确认（防误删），确认后调用 Server Action 删除。
 * 历史列表本体保持服务端组件（SleepHistory），仅这个交互点需要客户端。
 */
export default function SleepDeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="删除这条睡眠记录"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("确定删除这条睡眠记录吗？")) return;
        startTransition(async () => {
          await deleteSleepRecord(id);
        });
      }}
      className="ml-1 shrink-0 rounded-md p-1 text-muted-foreground/40 transition-colors hover:text-destructive disabled:opacity-50"
    >
      <Trash2 aria-hidden className="size-4" />
    </button>
  );
}
