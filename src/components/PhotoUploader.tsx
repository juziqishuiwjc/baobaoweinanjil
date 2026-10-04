"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus } from "lucide-react";
import { addPhoto } from "@/actions/photo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  compressImageFile,
  isSupportedImageFile,
  type CompressedImage,
} from "@/lib/image";

/**
 * 照片上传卡片（客户端组件）。
 *
 * 流程：选择文件 → 客户端 Canvas 压缩（大图 1280px + 缩略图 320px）
 * → 预览 + 可填备注 → 确认后调 addPhoto 入库。
 * 压缩在 onChange（用户手势后的异步任务）里做，不在渲染期，无 hydration 问题。
 */
export default function PhotoUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressed, setCompressed] = useState<CompressedImage | null>(null);
  const [fileName, setFileName] = useState("");
  const [caption, setCaption] = useState("");
  const [error, setError] = useState("");
  const [isCompressing, setIsCompressing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setCompressed(null);
    setFileName("");
    setCaption("");
    setError("");
    if (fileInputRef.current !== null) {
      fileInputRef.current.value = ""; // 允许重复选择同一文件
    }
  }

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file === undefined) return;

    setError("");
    if (!isSupportedImageFile(file)) {
      setError("请选择图片文件（JPG/PNG 等）");
      reset();
      return;
    }

    setIsCompressing(true);
    try {
      const result = await compressImageFile(file);
      setCompressed(result);
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "图片处理失败，请重试");
      reset();
    } finally {
      setIsCompressing(false);
    }
  }

  function onUpload() {
    if (compressed === null) return;
    startTransition(async () => {
      try {
        await addPhoto(compressed.thumbDataUrl, compressed.fullDataUrl, caption);
        reset(); // 成功后清空，回到待选择状态
      } catch (err) {
        setError(err instanceof Error ? err.message : "上传失败，请重试");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 隐藏的原生 input，label 触发选择 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        disabled={isCompressing || isPending}
        className="hidden"
        aria-label="选择宝宝照片"
      />

      {compressed === null ? (
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-14 w-full text-base"
          disabled={isCompressing || isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus aria-hidden />
          {isCompressing ? "处理图片中…" : "选择宝宝照片"}
        </Button>
      ) : (
        <div className="flex flex-col gap-3">
          {/* 预览区：固定高度防压缩后跳动 */}
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL 不适配 next/image */}
            <img
              src={compressed.fullDataUrl}
              alt={`待上传预览：${fileName}`}
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <Input
            type="text"
            placeholder="备注（可选），如：第一次翻身"
            value={caption}
            maxLength={200}
            onChange={(event) => setCaption(event.target.value)}
            disabled={isPending}
            aria-label="照片备注，可不填"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="lg"
              className="h-12 flex-1 text-base font-semibold"
              onClick={onUpload}
              disabled={isPending}
            >
              {isPending ? "上传中…" : "上传"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="h-12"
              onClick={reset}
              disabled={isPending}
            >
              取消
            </Button>
          </div>
        </div>
      )}

      {error !== "" && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
