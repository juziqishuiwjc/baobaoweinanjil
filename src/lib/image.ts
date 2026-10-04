/**
 * 客户端图片压缩工具（仅浏览器环境使用）。
 *
 * 上传前在客户端把图片压成两档 data URL：
 * - 大图：最长边 1280px、JPEG q0.8（点开查看用，约 200-400KB）
 * - 缩略图：最长边 320px、JPEG q0.6（网格展示用，约 15-30KB）
 *
 * 统一转 JPEG 顺带剥离 EXIF/GPS 信息；canvas 先铺白底，
 * 避免 PNG 透明区域转 JPEG 后变黑底。
 */

/** 大图最长边（px） */
const MAX_EDGE = 1280;
/** 大图 JPEG 质量 */
const JPEG_QUALITY = 0.8;
/** 缩略图最长边（px） */
const THUMB_EDGE = 320;
/** 缩略图 JPEG 质量 */
const THUMB_QUALITY = 0.6;

/** 压缩结果：大图与缩略图的 data URL */
export interface CompressedImage {
  fullDataUrl: string;
  thumbDataUrl: string;
}

/** 把 bitmap 按目标尺寸画到 canvas 并导出 JPEG data URL */
function drawToDataUrl(
  source: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (ctx === null) {
    throw new Error("图片处理失败，请换一张试试");
  }
  // 先铺白底再绘制，防止 PNG 透明区域转 JPEG 变黑底
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * 压缩用户选择的图片，返回 { 大图 dataURL, 缩略图 dataURL }。
 *
 * createImageBitmap 的 imageOrientation: "from-image" 确保
 * iPhone 竖拍照片按 EXIF 方向正确摆正（转 JPEG 后 EXIF 已剥离，
 * 不再依赖浏览器解读方向）。
 *
 * @throws 解码失败（部分老 iOS 的 HEIC、损坏文件）时抛中文错误
 */
export async function compressImageFile(
  file: File,
): Promise<CompressedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
  } catch {
    throw new Error("无法读取这张图片，请换一张试试");
  }

  try {
    const longest = Math.max(bitmap.width, bitmap.height);
    const fullScale = Math.min(1, MAX_EDGE / longest);
    const thumbScale = Math.min(1, THUMB_EDGE / longest);
    return {
      fullDataUrl: drawToDataUrl(
        bitmap,
        Math.max(1, Math.round(bitmap.width * fullScale)),
        Math.max(1, Math.round(bitmap.height * fullScale)),
        JPEG_QUALITY,
      ),
      thumbDataUrl: drawToDataUrl(
        bitmap,
        Math.max(1, Math.round(bitmap.width * thumbScale)),
        Math.max(1, Math.round(bitmap.height * thumbScale)),
        THUMB_QUALITY,
      ),
    };
  } finally {
    bitmap.close();
  }
}

/** 前端粗校验文件类型（真正的校验在 server action 里做前缀白名单） */
export function isSupportedImageFile(file: File): boolean {
  return /^image\//.test(file.type);
}
