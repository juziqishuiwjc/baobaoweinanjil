<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Baby Feeding Tracker — AI 编程规则指引

> 以下规则供 AI 编程助手（Claude Code 等）在本项目工作时**强制遵循**。上方 `nextjs-agent-rules` 块为 Next.js 16 官方注入，勿删。

## [Project Context]

- **项目定位**：宝宝喂奶记录器（Baby Feeding Tracker），为记录新生儿**王书熠**（2026-06-13 出生）配方奶喂奶时间而开发的轻量级 Web 应用。MVP 无需登录、无多用户体系。
- **线上状态**：✅ **MVP 已成功上线**，绑定专属域名 + HTTPS 证书稳定运行，最新功能（非必填奶量、动态间隔、宝宝头像）已在生产环境验证。
- **当前核心功能**：
  1. **倒计时表盘**（基于「上次喂奶时间 + 间隔小时数」实时计算下次喂奶时间）；
  2. **动态时间间隔**（用户在首页表盘 1 / 1.5 / 2 / 2.5 / 3 小时自由切换，持久化到 `localStorage`）；
  3. **可选奶量录入**（首页「记录」表单中奶量为非必填，可仅记时间不记奶量）；
  4. **历史记录列表**（按时间倒序展示最近 50 条）。
- **数据库**：**SQLite 单文件数据库**（`dev.db`，位于项目根）。通过 **Prisma 7 + driver adapter**（`@prisma/adapter-better-sqlite3`）访问。当前唯一数据模型 `FeedingRecord`（`id` / `amount?` / `time` / `createdAt`），其中 `amount` 可为空（仅记录时间、不记录奶量）。
- **前端布局**：严格 **Mobile-First 居中布局**——所有页面外层使用 `max-w-md mx-auto`「手机壳」容器，桌面端两侧留白，移动端铺满。**新增页面/组件必须沿用此布局约定**。
- **视觉基调**：柔和蓝色主色调（oklch hue 250），圆角卡片，母婴场景的温和观感。
- **可配置项（用户态，无需改代码）**：① 喂奶间隔由用户在首页表盘切换（1 / 1.5 / 2 / 2.5 / 3 小时），持久化到 `localStorage`（key `feeding-interval-hours`）；② 首页 Header 含宝宝头像（`public/avatar.jpg`，用户自行替换）。
- **部署目标**：Linux 服务器 + 宝塔面板 + 宝塔「Node 项目」管理器（自带 PM2 + 域名绑定 + Let's Encrypt）。完整步骤、端口与排障见 [BT_DEPLOY.md](BT_DEPLOY.md)。

## [Tech Constraints]

> 以下为硬性技术约束，违反将破坏构建或运行时行为。

1. **TypeScript 强类型（Strict）**：`tsconfig.json` 已开启 `strict: true`。全栈代码必须强类型，禁止 `any`、禁止 `@ts-ignore`。Server Action 与 Prisma 查询都要有明确类型。
2. **数据交互走 Next.js Server Actions**：前后端交互统一使用 **Server Actions**（`src/actions/feeding.ts`），**不新建 API Routes**。Server Action 写库后**必须调用 `revalidatePath`** 刷新受影响路由缓存。
3. **必须处理好 Hydration 错误**：客户端组件（`"use client"`）若涉及时间、随机数等 SSR/CSR 不一致的值，**必须用「null 占位 + `useEffect` 挂载后赋值」**的模式（参考 `FeedingTimer.tsx`）。禁止在渲染期直接调用 `Date.now()` / `Math.random()`。`localStorage` / `sessionStorage` 等浏览器 API 同理——**初始用默认值渲染保证两端一致**，`useEffect` 挂载后再读取覆盖（参考 `FeedingTimer.tsx` 的 `intervalHours`，key `feeding-interval-hours`）。
4. **UI 组件优先 Shadcn/UI 扩展**：新增 UI 一律基于 **shadcn 组件**（Radix UI 底层），**不要手写原生 HTML 表单元素/弹窗**；图标统一用 **lucide-react**。组件位于 `src/components/ui/`，通过 `npx shadcn@latest add <name>` 增加。（间隔选择器这类纯展示型 pill 按钮可用原生 `<button>` + Tailwind，不必引入 select 组件。）
5. **Prisma 7 特殊约定**（勿套用旧版记忆）：
   - 客户端从 `@/generated/prisma/client` 导入（**不是** `@prisma/client`）；
   - `schema.prisma` 的 `datasource db` **不写 `url`**，URL 由 `prisma.config.ts` 从 `.env` 的 `DATABASE_URL` 读取；
   - SQL 数据源**必须使用 driver adapter**（`PrismaBetterSqlite3`），实例化见 `src/lib/prisma.ts`；
   - `build` 脚本已含 `prisma generate`，`postinstall` 也会自动生成客户端。
6. **禁止 Google Fonts 外链**（大陆被墙）：字体通过 `next/font`（Geist）加载，CSS 变量 `--font-sans`。
7. **Next.js 16 有破坏性变更**：修改 `layout.tsx` / `page.tsx` / 路由相关代码前，**先读 `node_modules/next/dist/docs/`** 对应文档（`params`/`searchParams` 已是 Promise，类型化路由签名如 `LayoutProps<'/'>`）。
8. **生产部署底线（已上线实测）**：以下为真实服务器配置，**任何重装/迁移/重部署都必须沿用**：
   - **Node.js >= 22.0.0**（实测 `v22.14.0`）。Node 20.x 在 `npm install` 时会触发 `EBADENGINE` + C++ 编译失败，Node 18 直接启动报错。
   - **端口 = 3030**（生产已改为 3030 避开常见冲突，启动命令：`npm run start -- -p 3030`）。
   - **宝塔「Node 项目」管理器**（不是裸 PM2 + 手写 Nginx 反代）—— 它自动创建 PM2 进程 + 自动绑定域名 + 一键申请 HTTPS。
   - **运行用户 = root**（在项目设置里改）：非 root 用户会因 `dev.db` 文件权限触发 `Permission Denied` / 500。
   - 详细排障与部署步骤见 [BT_DEPLOY.md](BT_DEPLOY.md)。

## [Future Roadmap]

> MVP 已完成。以下为**待办（Todo）**功能，按优先级排列，开发前需与产品负责人（王律）确认范围。

- [ ] **Todo**：按周/月统计总奶量、平均单次奶量、每日喂奶次数图表（可考虑引入轻量图表库）
- [ ] **Todo**：修改已有记录（编辑奶量/喂奶时间）
- [ ] **Todo**：删除记录（带二次确认，防误删）
- [ ] **Todo**：历史记录按天分组的时间轴展示（当前为平铺倒序列表）
- [ ] **Todo**：PWA 离线支持 + 添加到主屏幕（manifest + service worker）
- [ ] **Todo**：家庭成员多端**实时同步**（需引入登录/账号体系，从 SQLite 迁移到 Postgres）
- [ ] **Todo**：喂奶时间到点提醒（浏览器通知 / 推送）
- [ ] **Todo**：单条记录备注（如吐奶、拍嗝、大便情况等观察项）
