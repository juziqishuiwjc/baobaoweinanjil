"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** 可选的喂奶间隔（小时） */
const INTERVAL_OPTIONS = [1, 1.5, 2, 2.5, 3];
/** 默认间隔（小时）—— SSR 与客户端首次渲染都用它，保证 hydration 一致 */
const DEFAULT_INTERVAL_HOURS = 2;
/** localStorage 键名 */
const INTERVAL_STORAGE_KEY = "feeding-interval-hours";

/** 把小时转毫秒 */
function hoursToMs(hours: number): number {
  return hours * 60 * 60 * 1000;
}

/** 把毫秒拆成 时/分/秒 */
function splitDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    h: Math.floor(totalSeconds / 3600),
    m: Math.floor((totalSeconds % 3600) / 60),
    s: totalSeconds % 60,
  };
}

/**
 * 检查浏览器是否原生支持 Notification API（SSR 下 window 不存在，需兜底）
 */
function getNotificationSupport(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/**
 * 当前通知权限状态。SSR 下用 'default' 占位，
 * 客户端挂载后再以 window.Notification.permission 覆盖。
 */
type PermissionStatus = "default" | "granted" | "denied" | "unsupported";

function readPermission(): PermissionStatus {
  if (!getNotificationSupport()) return "unsupported";
  return window.Notification.permission as PermissionStatus;
}

export default function FeedingTimer({
  lastFeedTime,
}: {
  lastFeedTime: Date | null;
}) {
  // now 用 null 占位：避免 SSR 与客户端 Date.now() 不一致导致 hydration 报错。
  // 挂载后再开始每秒更新。
  const [now, setNow] = useState<number | null>(null);
  // intervalHours 初始为默认值（SSR/CSR 一致）；挂载后再从 localStorage 读取覆盖，
  // 这样首次 hydration 两端都渲染「2h」，不会出现 hydration mismatch。
  const [intervalHours, setIntervalHours] = useState<number>(
    DEFAULT_INTERVAL_HOURS,
  );
  // 通知权限状态：SSR 用 'default'，挂载后再读真实值
  const [permission, setPermissionStatus] = useState<PermissionStatus>(
    "default",
  );
  // 同一周期内是否已发送过通知的标记（ref：不触发额外渲染）
  const hasNotifiedRef = useRef(false);

  // 挂载后：读取持久化的间隔 + 启动每秒计时 + 探测通知权限
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(INTERVAL_STORAGE_KEY);
      if (stored !== null) {
        const parsed = Number(stored);
        if (Number.isFinite(parsed) && INTERVAL_OPTIONS.includes(parsed)) {
          setIntervalHours(parsed);
        }
      }
    } catch {
      // localStorage 不可用（隐私模式等）时静默回退到默认值
    }

    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 挂载后探测通知支持与权限；如果还是 'default'，主动弹一次授权请求
  useEffect(() => {
    const current = readPermission();
    setPermissionStatus(current);
    if (current === "default") {
      // 用户可能拒绝，但首次进入页面主动请求一次提升开启率；
      // 失败（denied）时下次就不会再弹了。
      window.Notification
        .requestPermission()
        .then((next) => setPermissionStatus(next as PermissionStatus))
        .catch(() => {
          /* 忽略：部分浏览器/隐私模式下会抛错 */
        });
    }
  }, []);

  // 手动「开启通知」按钮：用户拒绝后想再次尝试的唯一入口
  async function requestPermission() {
    if (!getNotificationSupport()) return;
    try {
      const next = await window.Notification.requestPermission();
      setPermissionStatus(next as PermissionStatus);
    } catch {
      /* 静默忽略 */
    }
  }

  function handleIntervalChange(hours: number) {
    setIntervalHours(hours);
    try {
      window.localStorage.setItem(INTERVAL_STORAGE_KEY, String(hours));
    } catch {
      // 写入失败时静默忽略
    }
  }

  // 新一轮喂奶周期开始（lastFeedTime 变化）：重置通知标志，让下次倒计时归零时能再次提醒
  useEffect(() => {
    hasNotifiedRef.current = false;
  }, [lastFeedTime]);

  // 倒计时跨过 0 的那一秒触发通知
  useEffect(() => {
    if (now === null || lastFeedTime === null) return;
    if (permission !== "granted") return;
    if (hasNotifiedRef.current) return;

    const lastMs = new Date(lastFeedTime).getTime();
    const elapsedMs = now - lastMs;
    const remainingMs = hoursToMs(intervalHours) - elapsedMs;
    if (remainingMs <= 0) {
      try {
        new window.Notification("喂奶时间到了！", {
          body: "书熠宝宝该喝奶啦~",
          icon: "/avatar.jpg",
        });
        hasNotifiedRef.current = true;
      } catch {
        // 极少数浏览器/系统会抛错，静默忽略
      }
    }
  }, [now, lastFeedTime, intervalHours, permission]);

  // 间隔选择器（各状态共用）：始终可调，方便用户提前预设
  const intervalPicker = (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs text-muted-foreground">喂奶间隔</span>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {INTERVAL_OPTIONS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => handleIntervalChange(h)}
            aria-pressed={h === intervalHours}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              h === intervalHours
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-accent",
            )}
          >
            {h}h
          </button>
        ))}
      </div>
    </div>
  );

  // 通知权限提示按钮（顶部右上角小型按钮）
  // - granted：不显示（已有通知能力）
  // - default：显示「开启通知」可点击触发请求
  // - denied：显示「通知被禁用」灰色文字，提示用户在浏览器设置中开启
  // - unsupported：显示「浏览器不支持通知」
  const permissionBadge =
    permission === "granted" ? null : (
      <div className="flex items-center justify-end">
        {permission === "default" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={requestPermission}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Bell aria-hidden className="size-3.5" />
            开启通知
          </Button>
        )}
        {permission === "denied" && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground/70">
            <BellOff aria-hidden className="size-3.5" />
            通知被禁用
          </span>
        )}
        {permission === "unsupported" && (
          <span className="text-xs text-muted-foreground/70">
            浏览器不支持通知
          </span>
        )}
      </div>
    );

  // 空状态：没有任何喂奶记录（仍可预设间隔）
  if (!lastFeedTime) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-dashed bg-card/60 px-6 py-8 text-center">
        <div className="flex flex-col items-center justify-center gap-1">
          <p className="text-base font-medium text-foreground/80">
            还没有喂奶记录哦
          </p>
          <p className="text-xs text-muted-foreground">
            记录第一次喂奶后开始计时
          </p>
        </div>
        {permissionBadge}
        {intervalPicker}
      </div>
    );
  }

  const lastMs = new Date(lastFeedTime).getTime();
  const intervalMs = hoursToMs(intervalHours);

  // 尚未挂载（SSR / 首帧）：渲染稳定占位，避免时间不一致
  if (now === null) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border bg-card px-6 py-8 text-center shadow-sm">
        {permissionBadge}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground">距上次喂奶已过去</span>
          <span className="text-4xl font-bold tabular-nums tracking-tight text-muted-foreground/40">
            --分钟 --秒
          </span>
        </div>
        <div className="h-px w-full bg-border" />
        {intervalPicker}
      </div>
    );
  }

  const elapsedMs = now - lastMs; // 已过去
  const remainingMs = intervalMs - elapsedMs; // 距下次（负值=超时），基于动态间隔
  const isOvertime = remainingMs < 0;
  const { h, m, s } = splitDuration(elapsedMs);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border bg-card px-6 py-8 text-center shadow-sm">
      {permissionBadge}

      {/* 已过去 */}
      <div className="flex flex-col items-center gap-1">
        <span className="text-xs text-muted-foreground">距上次喂奶已过去</span>
        <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
          {h > 0 ? `${h}小时 ` : ""}
          {m}分钟 {s}秒
        </span>
      </div>

      <div className="h-px w-full bg-border" />

      {/* 距下次 / 超时警示（基于动态间隔） */}
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
            距下次喂奶（{intervalHours} 小时周期）
          </span>
          <span className="text-2xl font-semibold tabular-nums text-primary">
            剩余 {Math.floor(remainingMs / 60000)} 分钟
          </span>
        </div>
      )}

      {intervalPicker}
    </div>
  );
}