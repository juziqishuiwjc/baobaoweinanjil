"use client";

import { useState } from "react";
import type { PhotoMeta } from "@/actions/photo";
import PhotoViewer from "@/components/PhotoViewer";

/**
 * 照片网格（客户端组件）。
 *
 * 3 列方格缩略图（thumb 已在服务端随页面下发，体积小），
 * 点击某格打开 PhotoViewer 查看大图。
 *
 * 注意：网格内不格式化 takenAt（避免 client 端日期渲染的 hydration
 * mismatch），时间文案留给 Viewer 打开后展示。
 */
export default function PhotoGrid({ photos }: { photos: PhotoMeta[] }) {
  // 当前查看的照片 id；null = 关闭
  const [activeId, setActiveId] = useState<string | null>(null);
  const activePhoto = photos.find((p) => p.id === activeId) ?? null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            aria-label={
              photo.caption !== null
                ? `查看照片：${photo.caption}`
                : "查看这张照片"
            }
            onClick={() => setActiveId(photo.id)}
            className="group relative block aspect-square overflow-hidden rounded-lg border border-border bg-muted/40 transition-opacity hover:opacity-90"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL 不适配 next/image */}
            <img
              src={photo.thumb}
              alt={photo.caption ?? "宝宝照片"}
              loading="lazy"
              className="size-full object-cover"
            />
          </button>
        ))}
      </div>

      {/* 共享的大图查看弹窗（activeId 为 null 时关闭） */}
      <PhotoViewer photo={activePhoto} onOpenChange={() => setActiveId(null)} />
    </>
  );
}
