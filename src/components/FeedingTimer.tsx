"use client";

import { useEffect, useState } from "react";

/** 配方奶喂奶周期：2 小时 */
const FEED_INTERVAL_MS = 2 * 60 * 60 * 1000;

/** 把毫秒拆成 时/分/秒 */
function splitDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

export default function FeedingTimer({
  lastFeedTime,
}: {
  lastFeedTime: Date | null;
}) {
  // 用 null 占位：避免 SSR 与客户端 Date.now() 不一致导致的 hydration 报错。
  // 挂载后再开始每秒更新。
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 空状态：没有任何喂奶记录
  if (!lastFeedTime) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
        <p className="text-base font-medium text-foreground/80">
          还没有喂奶记录哦
        </p>
        <p className="text-xs text-muted-foreground">记录第一次喂奶后开始计时</p>
      </div>
    );
  }

  const lastMs = new Date(lastFeedTime).getTime();

  // 尚未挂载（SSR / 首帧）：渲染稳定占位，避免时间不一致
  if (now === null) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-8 text-center shadow-sm">
        <span className="text-xs text-muted-foreground">距上次喂奶已过去</span>
        <span className="text-4xl font-bold tabular-nums tracking-tight text-muted-foreground/40">
          --分钟 --秒
        </span>
      </div>
    );
  }

  const elapsedMs = now - lastMs; // 已过去
  const remainingMs = FEED_INTERVAL_MS - elapsedMs; // 距下次（负值=超时）
  const isOvertime = remainingMs < 0;
  const { h, m, s } = splitDuration(elapsedMs);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card px-6 py-8 text-center shadow-sm">
      {/* 已过去 */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">距上次喂奶已过去</span>
        <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
          {h > 0 ? `${h}小时 ` : ""}
          {m}分钟 {s}秒
        </span>
      </div>

      <div className="h-px w-full bg-border" />

      {/* 距下次 / 超时警示 */}
      {isOvertime ? (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">距下次喂奶</span>
          <span className="text-2xl font-bold tabular-nums text-red-500">
            已超时 {Math.floor(-remainingMs / 60000)} 分钟！
          </span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">
            距下次喂奶（2 小时周期）
          </span>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            剩余 {Math.floor(remainingMs / 60000)} 分钟
          </span>
        </div>
      )}
    </div>
  );
}
