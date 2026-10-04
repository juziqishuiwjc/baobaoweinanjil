# 书熠的喂养记录 · Baby Feeding Tracker

> 为记录新生儿**喂奶与成长**而开发的**轻量级、移动端优先** Web 应用。一键记录配方奶奶量，自动倒计时提醒下一次喂奶，「今日喝奶」统计一目了然；「成长相册」上传宝宝照片记录点滴变化（照片压缩后存本地数据库），两类内容 Tabs 独立视图互不干扰，方便全家人同步查看。

宝宝：**王书熠**（2026-06-13 出生）。配方奶喂养，默认约每 2 小时一次（间隔可调）。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🔄 **顶部 Tabs 双视图** | 首页头像下方 Tabs 切换「🍼 喂奶」/「📷 相册」两大功能；两组件树**完全独立**，互不影响。 |
| ⏱ **倒计时表盘** | 醒目展示「距上次喂奶已过去 X小时X分X秒」与「距下次喂奶剩余 X 分钟」；超时自动变红警示，每秒刷新。**喂奶间隔可在 1 / 1.5 / 2 / 2.5 / 3 小时间切换，选择自动记忆（localStorage）。** |
| 📊 **今日喝奶统计** | 喂奶 Tab 内实时汇总「今日喝奶 X ml · 共 N 次」，统计周期为**本地时间 0:00–24:00**；未填奶量的记录按每次 **150 ml** 估算计入（仅统计口径，历史列表仍显示「未记录奶量」）。 |
| 🍼 **一键记录奶量** | 输入奶量（ml）点「记录本次喂奶」即保存；**奶量可不填**（仅记录时间）；提交有 loading 态防重复，成功后清空。 |
| ✏️ **补记之前喂奶** | 表单下方「补记之前喂奶」按钮，弹 Dialog 选择历史时间（默认 1 小时前，可手动调整到任意过去时间，但不能晚于现在）；可选同时填奶量。 |
| 📷 **成长相册** | 上传宝宝照片记录成长变化：选图后**浏览器端自动压缩**（大图 1280px + 缩略图 320px，统一转 JPEG 并剥离位置信息），可填备注；3 列方格网格展示最近 60 张，点开看大图 + 备注 + 时间，支持删除（二次确认）。照片存本地 SQLite 数据库，随库一起备份。 |
| 🔔 **浏览器通知** | 倒计时归零时弹系统通知「喂奶时间到了！书熠宝宝该喝奶啦~」；首次进入页面主动请求一次权限，右上角徽标可手动再次触发；被拒绝后显示「通知被禁用」。 |
| 📜 **喂奶历史记录** | 按时间倒序展示最近 50 条，时间友好显示（「今天 14:30」「昨天」）；未填奶量的记录显示「未记录奶量」。 |
| 👶 **宝宝头像** | 首页 Header 圆形头像；把照片命名为 `avatar.jpg` 放进 `public/` 即可替换。 |
| 📱 **移动端优先** | `max-w-md` 居中「手机壳」布局，桌面端两侧留白，移动端铺满。 |
| 🎨 **柔和视觉** | 柔和蓝色主色调（oklch hue 250），圆角卡片，适合母婴场景。 |

> 数据无需登录，存储在本地 SQLite 数据库（单文件 `dev.db`）。

---

## 🛠 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 框架 | **Next.js 16**（App Router） | React 19 Server Components + Server Actions，Turbopack |
| 语言 | **TypeScript**（Strict 模式） | 全栈强类型 |
| 样式 | **Tailwind CSS v4** | CSS 变量主题（`@theme`），Mobile-first |
| 组件库 | **shadcn**（基于 Radix UI） | `button` / `card` / `input` 等组件，图标用 lucide-react |
| 数据库 | **Prisma 7 + SQLite** | 单文件数据库；v7 使用 driver adapter（`@prisma/adapter-better-sqlite3`） |
| 字体 | **Geist**（next/font） | 系统级加载，无外链 |

> ⚠️ 本项目使用了 **2026 年最新版**关键依赖（Next 16 / React 19 / Tailwind v4 / Prisma 7 / shadcn v4）。详见 [AGENTS.md](AGENTS.md) 中的技术约束。

---

## 📁 项目结构

```
baby-feeding-tracker/
├── prisma/
│   └── schema.prisma              # 数据模型：FeedingRecord + PhotoRecord（thumb/data/caption?/takenAt）+ SleepRecord（已停用，表保留）
├── prisma.config.ts               # Prisma 7 配置（datasource url 从 .env 读取）
├── public/
│   └── avatar.jpg                 # 宝宝头像（替换此文件即可换图）
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 全局布局（标题「书熠的喂养记录」、字体、lang=zh-CN）
│   │   ├── page.tsx               # 首页（Server Component，Tabs 组装喂奶/相册双视图 + 今日统计查询）
│   │   └── globals.css            # Tailwind v4 主题 token（柔和蓝主色）
│   ├── components/
│   │   ├── FeedingTimer.tsx       # 客户端组件：倒计时表盘 + 间隔选择器（hydration 安全 + localStorage）
│   │   ├── FeedingForm.tsx        # 客户端组件：喂奶记录表单（奶量可选，useTransition + loading）
│   │   ├── TodayFeedingStats.tsx  # 服务端组件：今日喝奶统计卡（0-24 点周期，未填按 150ml 估算）
│   │   ├── PhotoUploader.tsx      # 客户端组件：照片选择 + Canvas 压缩 + 预览/备注 + 上传
│   │   ├── PhotoGrid.tsx          # 客户端组件：3 列缩略图网格（点开大图弹窗）
│   │   ├── PhotoViewer.tsx        # 客户端组件：大图 Dialog（惰性加载 + 备注/时间 + 删除）
│   │   ├── PhotoDeleteButton.tsx  # 客户端组件：照片删除按钮（二次确认）
│   │   └── ui/                    # shadcn 组件（button / card / input / dialog / tabs）
│   ├── actions/
│   │   ├── feeding.ts             # Server Actions：addFeedingRecord(amount?) / getRecentRecords / getTodayRecords
│   │   └── photo.ts               # Server Actions：addPhoto / getPhotos（只取缩略图元数据）/ getPhotoData / deletePhoto
│   ├── lib/
│   │   ├── prisma.ts              # Prisma 客户端单例（driver adapter）
│   │   ├── datetime.ts            # 共享时间工具（datetime-local 格式化/解析 + 友好时间显示）
│   │   ├── feeding.ts             # 喂奶统计纯函数（今日 0 点边界 / 未填奶量 150ml 估算汇总）
│   │   ├── image.ts               # 客户端图片压缩（Canvas：大图 1280px + 缩略图 320px，统一转 JPEG）
│   │   └── utils.ts               # cn() 类名合并工具
│   └── generated/prisma/          # ⚙ Prisma 自动生成（.gitignore，勿手改）
├── .env.example                   # 环境变量模板
├── next.config.ts                 # Next.js 配置（含 serverActions bodySizeLimit: 2mb）
├── components.json                # shadcn 配置
├── BT_DEPLOY.md                   # ⭐ 宝塔面板部署指南
└── AGENTS.md                      # ⭐ AI 编程规则指引
```

---

## 🚀 本地开发

> 前置：Node.js **>= 22.x**（生产实测 `v22.14.0`）。**不要装 Node 20.x**——Prisma 7 + `better-sqlite3` 在 Node 20 下会触发 `EBADENGINE` 与 C++ 编译失败。

```bash
# 1. 安装依赖
npm install                # postinstall 会自动生成 Prisma 客户端

# 2. 初始化数据库（创建 dev.db 并建表）
npx prisma db push

# 3. 启动开发服务器
npm run dev                # 打开 http://localhost:3000（本地 dev 默认端口）
```

其他常用命令：

```bash
npm run build              # 生产构建（= prisma generate && next build）
npm run start              # 以生产模式启动（需先 build）
npm run start -- -p 3030   # 生产环境推荐：监听 3030 端口（详见下方「生产部署」）
npm run pack               # 📦 一键打包 → 生成 baobaoweinaiji/deploy.zip（详见下方「打包与部署」）
npm run lint               # ESLint 检查
```

---

## 🎨 自定义

- **换宝宝头像**：把照片重命名为 `avatar.jpg`（小写、`.jpg`），覆盖 `public/avatar.jpg` 即可（建议正方形）。生产模式换图后需清 `.next/cache/images/` 或重启服务，再浏览器硬刷新（`Ctrl+F5`）。
- **改喂奶间隔**：直接点首页表盘下方的按钮切换（1~3 小时），选择会自动记住（localStorage），无需改代码。

---

## 📦 打包与生产部署

### 一键打包 → `baobaoweinaiji/deploy.zip`

```bash
npm run pack
```

脚本（[scripts/pack.mjs](scripts/pack.mjs)）会把项目拷贝到**系统临时目录**的 staging 文件夹（不污染项目目录），再打成 `deploy.zip` 输出到**项目父目录**（`baobaoweinaiji/deploy.zip`）。打包结束后 staging 自动清理。**严格排除**：

- `node_modules/`、`/.next/`、`/.git/`、`/src/generated/prisma/`、`*.tsbuildinfo`
- `/dev.db`、`*.db`、`*.db-journal`（线上数据库文件，绝对不能覆盖）
- `/.claude/`、`/.agents/`、`/.windsurf/`、`skills-lock.json`（AI 工具本地配置）

> ⚠️ **关键约束**：数据库驱动 `better-sqlite3` 是原生模块，**必须在目标服务器上重新编译**——不能直接把 Windows 的 `node_modules` 传上去。打包 zip 也不应包含 `node_modules`，让服务器重新 `npm install` 现场编译。

> 🚨 **🚨 数据库结构变更部署红线（2026-10-04 相册功能更新，必读）**：
>
> **本次更新改了 `prisma/schema.prisma`：新增 `PhotoRecord` 表（只加表，不删任何表/字段，不丢数据），并下线了睡眠记录功能（`SleepRecord` 表与数据保留，但功能代码已删除）。在服务器解压源码后，必须在执行 `npm run build` 之前：**
>
> ```bash
> # 0. 【必须先做】手动删除本次下线的睡眠功能残留文件（zip 覆盖解压不会删除它们，
> #    残留文件引用已删除的依赖，会导致服务器 build 报 TS2307/TS2339）
> rm -f src/actions/sleep.ts src/components/SleepTracker.tsx \
>       src/components/SleepHistory.tsx src/components/SleepDeleteButton.tsx src/lib/sleep.ts
>
> # 1. 备份线上数据库（习惯性保险，本次变更本身不丢数据）
> cp dev.db dev.db.backup-$(date +%Y%m%d)
>
> # 2. 同步表结构（新建 PhotoRecord 表）
> npx prisma db push
> ```
>
> **本次是 additive 变更**：`prisma db push` 只新建 `PhotoRecord` 表，喂奶/睡眠历史数据不受影响。若 push 时弹出「数据丢失确认」，即为异常，停下来排查，**不要**盲目 `--accept-data-loss`。
>
> 跳过 `db push` 直接 build + 重启，相册一访问就会报 **`no such table: PhotoRecord`** 500 错误。同样**绝对不要**用「删库重建」的方式同步结构（`rm dev.db` 会清空所有线上喂奶记录）。
>
> **⚠️ 服务器残留文件（实测踩坑两次：2026-09-02 换尿布、2026-10-04 睡眠）**：`unzip` 覆盖解压**不会删除**服务器上已不在新包里的旧文件。上一步第 0 条的 `rm` 必须执行，否则 build 报 `error TS2307: Cannot find module '@/actions/sleep'` 或 `TS2339: Property 'sleepRecord' does not exist`。
>
> **⚠️ next.config.ts 有变更**：本次新增 `serverActions.bodySizeLimit: "2mb"`（照片上传需要），该配置**重启进程后才生效**——`npm run build` 后必须 `pm2 restart baby-feeding-tracker`。
>
> 完整增量部署顺序：上传 `deploy.zip` → 解压 → **rm 残留文件 → 备份 dev.db → `npx prisma db push`（仅 schema 有变更时）** → `npm run build` → `pm2 restart baby-feeding-tracker`。详见 [BT_DEPLOY.md](BT_DEPLOY.md) Q8/Q9。

### 生产部署（Linux 宝塔面板 · 实测配置）

| 关键项 | 生产实测值 | 备注 |
|--------|----------|------|
| **Node.js** | **>= 22.0.0**（实测 v22.14.0） | Node 20.x 会触发 `EBADENGINE`，不要用 |
| **端口** | **3030** | 启动命令：`npm run start -- -p 3030` |
| **运行用户** | **`root`** | 非 root 会因 `dev.db` 权限触发 500（详见 BT_DEPLOY.md Q6） |
| **进程管理** | 宝塔「Node 项目」管理器 | 自动 PM2 + 自动域名绑定 + 一键 HTTPS |

> ✅ **最简部署路线（实测）**：在宝塔「Node 项目」里添加本项目 → 启动命令填 `npm run start -- -p 3030` → 同页面绑定域名 → 一键申请 Let's Encrypt 证书 → **完事**。不需要手写 Nginx 反代，不需要单独建 PHP 站点。
>
> 完整排障与逐步操作：[BT_DEPLOY.md](BT_DEPLOY.md)

---

## 📄 文档索引

| 文档 | 说明 |
|------|------|
| [AGENTS.md](AGENTS.md) | AI 编程规则指引（项目上下文 / 技术约束 / 未来路线图）+ Next.js 16 注意事项 |
| [BT_DEPLOY.md](BT_DEPLOY.md) | 宝塔面板部署指南（逐步操作） |

---

## 📌 未来路线图

> 详见 [AGENTS.md](AGENTS.md) 的 `[Future Roadmap]` 板块。待办包括：奶量统计图表、修改/删除喂奶记录、PWA 离线、家庭成员多端实时同步等。

---

**维护者**：王吉成 · 宝宝：王书熠
