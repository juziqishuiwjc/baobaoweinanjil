"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

/**
 * 宝宝照片（成长相册）的 Server Actions。
 *
 * 存储：客户端 Canvas 压缩后的 data URL 直接入 SQLite TEXT 字段
 * （thumb 缩略图 + data 大图双字段，网格只加载 thumb，点开才取 data）。
 */

/** 客户端统一压成 JPEG，服务端白名单只放行该前缀（顺带防 SVG/XSS 入库） */
const JPEG_PREFIX = "data:image/jpeg;base64,";
/** 与 bodySizeLimit=2mb 配合的字符数上限（base64 比二进制膨胀约 4/3） */
const MAX_FULL_CHARS = 2_600_000; // ≈1.9MB 二进制
const MAX_THUMB_CHARS = 300_000;
const MAX_CAPTION_CHARS = 200;
/** 相册列表展示上限（缩略图很小，60 张 ≈ 1-2MB payload，可接受） */
const PHOTOS_TAKE = 60;

/** 照片元数据（列表用，绝不含 data 大图） */
export interface PhotoMeta {
  id: string;
  thumb: string;
  caption: string | null;
  takenAt: Date;
}

/**
 * 相册列表：只取缩略图元数据，最近 60 张。
 *
 * 不 select data 字段——这是相册首屏性能的关键
 * （60 张大图 data URL 会有 12MB+ payload）。
 */
export async function getPhotos(): Promise<PhotoMeta[]> {
  return prisma.photoRecord.findMany({
    orderBy: { takenAt: "desc" },
    take: PHOTOS_TAKE,
    select: { id: true, thumb: true, caption: true, takenAt: true },
  });
}

/**
 * 按 id 惰性取单张大图 data URL（点开查看时才调用，一次一张）。
 * 不存在时返回 null。
 */
export async function getPhotoData(id: string): Promise<string | null> {
  const photo = await prisma.photoRecord.findUnique({
    where: { id },
    select: { data: true },
  });
  return photo?.data ?? null;
}

/**
 * 新增照片。
 *
 * @param thumbDataUrl 缩略图 data URL（客户端压缩，最长边 320px）
 * @param fullDataUrl  大图 data URL（客户端压缩，最长边 1280px）
 * @param caption      备注，可省略；超长截断，空白存 null
 */
export async function addPhoto(
  thumbDataUrl: string,
  fullDataUrl: string,
  caption?: string | null,
) {
  // 服务端校验兜底：不信任客户端压缩结果
  if (!fullDataUrl.startsWith(JPEG_PREFIX)) {
    throw new Error("只支持上传 JPG/PNG 等常见图片（将自动转为 JPEG）");
  }
  if (!thumbDataUrl.startsWith(JPEG_PREFIX)) {
    throw new Error("缩略图数据异常，请重试");
  }
  if (fullDataUrl.length > MAX_FULL_CHARS) {
    throw new Error("图片过大，请重新选择后上传");
  }
  if (thumbDataUrl.length > MAX_THUMB_CHARS) {
    throw new Error("缩略图数据异常，请重试");
  }

  const trimmed = caption?.trim() ?? "";
  await prisma.photoRecord.create({
    data: {
      thumb: thumbDataUrl,
      data: fullDataUrl,
      caption: trimmed === "" ? null : trimmed.slice(0, MAX_CAPTION_CHARS),
      takenAt: new Date(),
    },
  });

  revalidatePath("/");
}

/**
 * 删除照片（前端 window.confirm 二次确认；幂等：不存在时静默返回）。
 */
export async function deletePhoto(id: string) {
  const existing = await prisma.photoRecord.findUnique({ where: { id } });
  if (existing === null) return;

  await prisma.photoRecord.delete({ where: { id } });
  revalidatePath("/");
}
