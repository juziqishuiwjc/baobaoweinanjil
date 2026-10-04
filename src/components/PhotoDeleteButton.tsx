"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePhoto } from "@/actions/photo";

/**
 * 照片的删除按钮（客户端组件）。
 *
 * 点击后 window.confirm 二次确认（防误删），确认后调用 Server Action 删除。
 * 用于 PhotoViewer 内；删除成功后通过 onDeleted 通知父级（如关闭弹窗）。
 */
export default function PhotoDeleteButton({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-label="删除这张照片"
      disabled={isPending}
      onClick={() => {
        if (!window.confirm("确定删除这张照片吗？")) return;
        startTransition(async () => {
          await deletePhoto(id);
          onDeleted?.();
        });
      }}
      className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md p-1 text-sm text-destructive/70 transition-colors hover:text-destructive disabled:opacity-50"
    >
      <Trash2 aria-hidden className="size-4" />
      {isPending ? "删除中…" : "删除照片"}
    </button>
  );
}
