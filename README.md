# 书熠的喂奶记录 · Baby Feeding Tracker

> 为记录新生儿喂奶时间而开发的**轻量级、移动端优先** Web 应用。一键记录配方奶奶量，自动倒计时提醒下一次喂奶，历史记录一目了然，方便全家人同步查看。

宝宝：**王书熠**（2026-06-13 出生）。配方奶喂养，约每 2 小时一次。

---

## ✨ 核心功能（MVP）

| 功能 | 说明 |
|------|------|
| ⏱ **倒计时表盘** | 首页醒目展示「距上次喂奶已过去 X小时X分X秒」与「距下次喂奶剩余 X 分钟」；超过 2 小时周期自动变红警示。每秒自动刷新。 |
| 🍼 **一键记录奶量** | 输入奶量（ml），点「记录本次喂奶」即可保存；提交时有 loading 态防重复点击，成功后自动清空。 |
| 📜 **历史记录** | 按时间倒序展示最近 50 条记录，时间友好显示（「今天 14:30」「昨天」），奶量用主题色高亮。 |
| 📱 **移动端优先** | `max-w-md` 居中「手机壳」布局，桌面端两侧留白，手机端铺满。 |
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
│   └── schema.prisma              # 数据模型：FeedingRecord（id/amount/time/createdAt）
├── prisma.config.ts               # Prisma 7 配置（datasource url 从 .env 读取）
├── src/
│   ├── app/
│   │   ├── layout.tsx             # 全局布局（标题「书熠的喂奶记录」、字体、lang=zh-CN）
│   │   ├── page.tsx               # 首页（Server Component，组装表盘+表单+历史）
│   │   └── globals.css            # Tailwind v4 主题 token（柔和蓝主色）
│   ├── components/
│   │   ├── FeedingTimer.tsx       # 客户端组件：倒计时表盘（hydration 安全）
│   │   ├── FeedingForm.tsx        # 客户端组件：记录表单（useTransition + loading）
│   │   └── ui/                    # shadcn 组件（button / card / input / dialog）
│   ├── actions/
│   │   └── feeding.ts             # Server Actions：addFeedingRecord / getRecentRecords
│   ├── lib/
│   │   └── prisma.ts              # Prisma 客户端单例（driver adapter）
│   └── generated/prisma/          # ⚙ Prisma 自动生成（.gitignore，勿手改）
├── .env.example                   # 环境变量模板
├── next.config.ts                 # Next.js 配置
├── components.json                # shadcn 配置
├── BT_DEPLOY.md                   # ⭐ 宝塔面板部署指南
└── AGENTS.md                      # ⭐ AI 编程规则指引
```

---

## 🚀 本地开发

> 前置：Node.js **20+**（Next 16 要求）。

```bash
# 1. 安装依赖
npm install                # postinstall 会自动生成 Prisma 客户端

# 2. 初始化数据库（创建 dev.db 并建表）
npx prisma db push

# 3. 启动开发服务器
npm run dev                # 打开 http://localhost:3000
```

其他常用命令：

```bash
npm run build              # 生产构建（= prisma generate && next build）
npm run start              # 以生产模式启动（需先 build）
npm run lint               # ESLint 检查
```

---

## 📦 生产部署

本项目部署到 Linux 服务器（宝塔面板 + PM2 + Nginx）。

> ⚠️ **关键**：数据库驱动 `better-sqlite3` 是原生模块，**必须在目标服务器上重新编译**——不能直接把 Windows 的 `node_modules` 传上去。完整步骤见 👉 **[BT_DEPLOY.md](BT_DEPLOY.md)**。

---

## 📄 文档索引

| 文档 | 说明 |
|------|------|
| [AGENTS.md](AGENTS.md) | AI 编程规则指引（项目上下文 / 技术约束 / 未来路线图）+ Next.js 16 注意事项 |
| [BT_DEPLOY.md](BT_DEPLOY.md) | 宝塔面板部署指南（逐步操作） |

---

## 📌 未来路线图

> 详见 [AGENTS.md](AGENTS.md) 的 `[Future Roadmap]` 板块。当前 MVP 已完成，待办包括：奶量统计图表、修改/删除记录、PWA 离线、家庭成员多端实时同步等。

---

**维护者**：王吉成 · 宝宝：王书熠
