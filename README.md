# 书熠的喂养记录 · Baby Feeding Tracker

> 为记录新生儿**喂奶与睡眠**而开发的**轻量级、移动端优先** Web 应用。一键记录配方奶奶量，自动倒计时提醒下一次喂奶；一键开始/结束睡眠计时、自动算时长并区分白天小睡与夜间睡眠，两类记录 Tabs 独立视图互不干扰，历史记录一目了然，方便全家人同步查看。

宝宝：**王书熠**（2026-06-13 出生）。配方奶喂养，默认约每 2 小时一次（间隔可调）。

---

## ✨ 核心功能

| 功能 | 说明 |
|------|------|
| 🔄 **顶部 Tabs 双视图** | 首页头像下方 Tabs 切换「🍼 喂奶」/「😴 睡眠」两大功能；两组件树、两份历史时间轴**完全独立**，互不影响。 |
| ⏱ **倒计时表盘** | 醒目展示「距上次喂奶已过去 X小时X分X秒」与「距下次喂奶剩余 X 分钟」；超时自动变红警示，每秒刷新。**喂奶间隔可在 1 / 1.5 / 2 / 2.5 / 3 小时间切换，选择自动记忆（localStorage）。** |
| 🍼 **一键记录奶量** | 输入奶量（ml）点「记录本次喂奶」即保存；**奶量可不填**（仅记录时间）；提交有 loading 态防重复，成功后清空。 |
| ✏️ **补记之前喂奶** | 表单下方「补记之前喂奶」按钮，弹 Dialog 选择历史时间（默认 1 小时前，可手动调整到任意过去时间，但不能晚于现在）；可选同时填奶量。 |
| 😴 **一键睡眠计时** | 宝宝睡着时点「开始睡觉」（`h-20` 大按钮，单手盲操友好），醒来点「醒来了」自动算时长；睡眠中实时显示「宝宝已睡 X小时X分X秒」，可预先填写**醒来体温**（选填，30–45℃ 区间校验）；误触可「取消本次计时」撤回。 |
| ✏️ **补记之前睡觉** | 与喂奶补记同款交互：弹 Dialog 填入睡时间 + 醒来时间 + 可选体温（默认入睡 1 小时前、醒来当前，不能晚于现在；校验醒来必须晚于入睡）。 |
| 📜 **睡眠历史** | 独立列表按入睡时间倒序展示最近 50 条：**🌙 夜间 / ☀️ 白天徽标按入睡时间自动判断**（20:00–次日 7:00 为夜间，不入库）、时间区间、时长、体温；顶部汇总「今日已睡」（跨午夜长觉只计今天内的部分）；每条支持删除（二次确认防误删）。 |
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
│   └── schema.prisma              # 数据模型：FeedingRecord + SleepRecord（startTime / endTime? / temperature?）
├── prisma.config.ts               # Prisma 7 配置（datasource url 从 .env 读取）
├── public/
│   └── avatar.jpg                 # 宝宝头像（替换此文件即可换图）
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 全局布局（标题「书熠的喂养记录」、字体、lang=zh-CN）
│   │   ├── page.tsx               # 首页（Server Component，Tabs 组装喂奶/睡眠双视图）
│   │   └── globals.css            # Tailwind v4 主题 token（柔和蓝主色）
│   ├── components/
│   │   ├── FeedingTimer.tsx       # 客户端组件：倒计时表盘 + 间隔选择器（hydration 安全 + localStorage）
│   │   ├── FeedingForm.tsx        # 客户端组件：喂奶记录表单（奶量可选，useTransition + loading）
│   │   ├── SleepTracker.tsx       # 客户端组件：睡眠计时卡片（开始/醒来/取消 + 体温 + 补记弹窗）
│   │   ├── SleepHistory.tsx       # 服务端组件：睡眠历史列表（昼夜徽标 + 今日已睡汇总）
│   │   ├── SleepDeleteButton.tsx  # 客户端组件：睡眠记录删除按钮（二次确认）
│   │   └── ui/                    # shadcn 组件（button / card / input / dialog / tabs）
│   ├── actions/
│   │   ├── feeding.ts             # Server Actions：addFeedingRecord(amount?) / getRecentRecords
│   │   └── sleep.ts               # Server Actions：startSleep / endSleep / cancelSleep / addSleepRecord / deleteSleepRecord / getSleepRecords / getActiveSleep
│   ├── lib/
│   │   ├── prisma.ts              # Prisma 客户端单例（driver adapter）
│   │   ├── datetime.ts            # 共享时间工具（datetime-local 格式化/解析 + 友好时间显示）
│   │   ├── sleep.ts               # 睡眠纯计算工具（昼夜判断 / 时长格式化 / 今日已睡汇总）
│   │   └── utils.ts               # cn() 类名合并工具
│   └── generated/prisma/          # ⚙ Prisma 自动生成（.gitignore，勿手改）
├── .env.example                   # 环境变量模板
├── next.config.ts                 # Next.js 配置
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

> 🚨 **🚨 数据库结构变更部署红线（2026-09-02 睡眠功能更新，必读）**：
>
> **本次更新改了 `prisma/schema.prisma`：新增 `SleepRecord` 表，同时删除了 `DiaperRecord` 表（换尿布功能已下线）。在服务器解压源码后，必须在执行 `npm run build` 之前，先备份数据库、再执行：**
>
> ```bash
> # 1. 先备份线上数据库（重要！本次变更会删除 DiaperRecord 表及其全部历史数据）
> cp dev.db dev.db.backup-$(date +%Y%m%d)
>
> # 2. 同步表结构
> npx prisma db push
> ```
>
> **⚠️ 与以往 additive 变更不同**：`prisma db push` 对「新增表/加字段」是增量同步、不丢数据；但对「**删表/删字段**」会**直接 DROP 并永久删除该表数据**（本次即删除换尿布表）。因此**必须先备份** `dev.db`；若想保留换尿布历史，也可从备份文件随时找回。
>
> 如果跳过 `db push` 直接 build + 重启，睡眠功能一访问就会报 **`no such table: SleepRecord`** 500 错误。同样**绝对不要**用「删库重建」的方式同步结构（`rm dev.db` 会清空所有线上喂奶记录）。
>
> **⚠️ 删除文件类变更**：`unzip` 覆盖解压**不会删除**服务器上已不在新包里的旧文件。本次下线换尿布时删除的 `src/actions/diaper.ts`、`src/components/DiaperForm.tsx`、`src/components/DiaperHistory.tsx` 需在服务器手动 `rm`，否则 build 报 `error TS2339: Property 'diaperRecord' does not exist`（实测踩坑 2026-09-02）。
>
> 完整增量部署顺序：上传 `deploy.zip` → 解压 → **备份 dev.db → `npx prisma db push`（仅 schema 有变更时）** → `npm run build` → `pm2 restart baby-feeding-tracker`。详见 [BT_DEPLOY.md](BT_DEPLOY.md) Q8/Q9。

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
