"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getPhotoData, type PhotoMeta } from "@/actions/photo";
import PhotoDeleteButton from "@/components/PhotoDeleteButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatFriendlyTime } from "@/lib/datetime";

/**
 * 大图查看弹窗（客户端组件）。
 *
 * 打开时才按 id 调 getPhotoData 惰性拉取大图（一次一张），
 * 用 useRef Map 缓存已拉取的结果，避免反复打开重复请求。
 * 时间文案在弹窗打开后的客户端渲染中展示（SSR 时弹窗关闭，无 hydration 问题）。
 */
export default function PhotoViewer({
  photo,
  onOpenChange,
}: {
  photo: PhotoMeta | null;
  onOpenChange: () => void;
}) {
  // 已拉取过的大图缓存（跨打开复用）
  const cacheRef = useRef<Map<string, string>>(new Map());
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // photo 变化（打开新照片）时拉取大图
  useEffect(() => {
    if (photo === null) return;
    const cached = cacheRef.current.get(photo.id);
    if (cached !== undefined) {
      setDataUrl(cached);
      return;
    }
    setDataUrl(null);
    startTransition(async () => {
      try {
        const full = await getPhotoData(photo.id);
        if (full !== null) {
          cacheRef.current.set(photo.id, full);
        }
        setDataUrl(full);
      } catch {
        setDataUrl(null);
      }
    });
  }, [photo]);

  return (
    <Dialog open={photo !== null} onOpenChange={(open) => !open && onOpenChange()}>
      <DialogContent className="sm:max-w-md">
        {photo !== null && (
          <>
            <DialogHeader>
              <DialogTitle>
                {photo.caption !== null && photo.caption !== ""
                  ? photo.caption
                  : "宝宝照片"}
              </DialogTitle>
              {/* 弹窗打开后才渲染时间（客户端），无 hydration mismatch */}
              <DialogDescription>
                {formatFriendlyTime(photo.takenAt)}
              </DialogDescription>
            </DialogHeader>

            <div className="flex max-h-[70vh] items-center justify-center overflow-hidden rounded-lg bg-muted/40">
              {dataUrl === null ? (
                <div className="flex h-64 w-full items-center justify-center text-sm text-muted-foreground">
                  {isPending ? "加载中…" : "图片加载失败"}
                </div>
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element -- data URL 不适配 next/image */
                <img
                  src={dataUrl}
                  alt={photo.caption ?? "宝宝照片"}
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>

            <div className="flex justify-end">
              <PhotoDeleteButton id={photo.id} onDeleted={onOpenChange} />
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
