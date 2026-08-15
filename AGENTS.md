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
- **线上状态**：✅ **MVP 已成功部署至独立 Linux 服务器（宝塔面板）**，绑定专属域名 + HTTPS 证书稳定运行，最新功能（非必填奶量、动态间隔、宝宝头像、Tabs 双视图 + 换尿布记录）已在生产环境验证。
- **数据架构**：**SQLite 单文件数据库**（详见下方数据库条目）。后续开发必须保持与现有架构兼容——除非显式规划迁移到 Postgres / 多端同步，**不得擅自引入新数据库或重构数据访问层**。
- **当前核心功能**：
  1. **顶部 Tabs 双视图**（Shadcn Tabs 切换「喂奶」/「换尿布」，两组件树与两份历史时间轴完全独立，2026-08-15 上线）；
  2. **倒计时表盘**（基于「上次喂奶时间 + 间隔小时数」实时计算下次喂奶时间）；
  2. **动态时间间隔**（用户在首页表盘 1 / 1.5 / 2 / 2.5 / 3 小时自由切换，持久化到 `localStorage`）；
  3. **可选奶量录入**（首页「记录」表单中奶量为非必填，可仅记时间不记奶量）；
  4. **补记之前喂奶**（首页表单下方的次级入口 `补记之前喂奶` 按钮，弹 Dialog 选择历史时间 `datetime-local`，可同时补奶量；时间不能晚于现在）；
  5. **浏览器通知提醒**（倒计时归零时调 Web Notifications API 弹系统通知；首次进入页面主动请求一次权限；同一周期内通过 `useRef` 去重，新一轮喂奶自动重置）；
  6. **历史记录列表**（按时间倒序展示最近 50 条）；
  7. **一键换尿布记录**（`DiaperForm` 三个大按钮 `h-20`：💦嘘嘘 / 💩便便 / 🧻都有，点击即记录当前时间，单手盲操友好；另有同款「补记之前换尿布」Dialog）；
  8. **换尿布独立历史**（`DiaperHistory` 服务端组件，与喂奶历史 UI 同构但数据完全隔离，各取最近 50 条）。
- **数据库**：**SQLite 单文件数据库**（`dev.db`，位于项目根）。通过 **Prisma 7 + driver adapter**（`@prisma/adapter-better-sqlite3`）访问。数据模型两个：`FeedingRecord`（`id` / `amount?` / `time` / `createdAt`，`amount` 可为空）与 `DiaperRecord`（`id` / `type` / `time` / `createdAt`，`type` 为字符串 `'pee' | 'poop' | 'both'`，联合类型定义在 `src/actions/diaper.ts` 的 `DiaperType`）。
- **前端布局**：严格 **Mobile-First 居中布局**——所有页面外层使用 `max-w-md mx-auto`「手机壳」容器，桌面端两侧留白，移动端铺满。**新增页面/组件必须沿用此布局约定**。
- **视觉基调**：柔和蓝色主色调（oklch hue 250），圆角卡片，母婴场景的温和观感。
- **可配置项（用户态，无需改代码）**：① 喂奶间隔由用户在首页表盘切换（1 / 1.5 / 2 / 2.5 / 3 小时），持久化到 `localStorage`（key `feeding-interval-hours`）；② 首页 Header 含宝宝头像（`public/avatar.jpg`，用户自行替换）。
- **部署目标**：Linux 服务器 + 宝塔面板 + 宝塔「Node 项目」管理器（自带 PM2 + 域名绑定 + Let's Encrypt）。完整步骤、端口与排障见 [BT_DEPLOY.md](BT_DEPLOY.md)。

## [Tech Constraints]

> 以下为硬性技术约束，违反将破坏构建或运行时行为。

1. **TypeScript 强类型（Strict）**：`tsconfig.json` 已开启 `strict: true`。全栈代码必须强类型，禁止 `any`、禁止 `@ts-ignore`。Server Action 与 Prisma 查询都要有明确类型。
2. **数据交互严格遵循 Next.js App Router Server Actions 规范**：前后端交互统一使用 **Server Actions**（`src/actions/feeding.ts`），**不新建 API Routes**。Server Action 写库后**必须调用 `revalidatePath`** 刷新受影响路由缓存。新增数据交互一律加在 `src/actions/feeding.ts`（或同目录新文件），保持架构统一。
3. **Mobile-First 居中布局（强制约束）**：所有页面/组件外层必须使用 `max-w-md mx-auto`「手机壳」容器（Tailwind 写法），桌面端两侧留白、移动端铺满。**新增任何 UI 必须沿用此布局约定**，不得换成全宽布局或响应式两栏。视觉基调（柔和蓝 oklch hue 250、圆角卡片）同样不得擅自调整。
4. **必须处理好 Hydration 错误**：客户端组件（`"use client"`）若涉及时间、随机数等 SSR/CSR 不一致的值，**必须用「null 占位 + `useEffect` 挂载后赋值」**的模式（参考 `FeedingTimer.tsx`）。禁止在渲染期直接调用 `Date.now()` / `Math.random()`。`localStorage` / `sessionStorage` 等浏览器 API 同理——**初始用默认值渲染保证两端一致**，`useEffect` 挂载后再读取覆盖（参考 `FeedingTimer.tsx` 的 `intervalHours`，key `feeding-interval-hours`）。
5. **UI 组件优先 Shadcn/UI 扩展**：新增 UI 一律基于 **shadcn 组件**（Radix UI 底层），**不要手写原生 HTML 表单元素/弹窗**；图标统一用 **lucide-react**。组件位于 `src/components/ui/`，通过 `npx shadcn@latest add <name>` 增加。（间隔选择器这类纯展示型 pill 按钮可用原生 `<button>` + Tailwind，不必引入 select 组件。）
   - **多视图切换最佳实践（2026-08-15 换尿布功能验证）**：新增并列功能视图时用 Shadcn `Tabs`（`src/components/ui/tabs.tsx`）挂在首页 Header 下方，`TabsContent` 内各自组装组件树，**两组数据/时间轴完全隔离**（`page.tsx` 用 `Promise.all` 并发查询）。本项目依赖是**统一的 `radix-ui` 包**（已含全部原语），CLI 不可用时可直接按 shadcn 官方模板手写 `src/components/ui/tabs.tsx`（import 用 `radix-ui` 而非 `@radix-ui/react-*`），**零新增依赖**。
   - **单手盲操按钮规格**：高频操作按钮（如换尿布三大状态）用 `h-20`（80px 高）+ emoji 图标 + `active:scale` 微反馈，禁用 `size="sm"` 以下规格。
6. **Prisma 7 特殊约定**（勿套用旧版记忆）：
   - 客户端从 `@/generated/prisma/client` 导入（**不是** `@prisma/client`）；
   - `schema.prisma` 的 `datasource db` **不写 `url`**，URL 由 `prisma.config.ts` 从 `.env` 的 `DATABASE_URL` 读取；
   - SQL 数据源**必须使用 driver adapter**（`PrismaBetterSqlite3`），实例化见 `src/lib/prisma.ts`；
   - `build` 脚本已含 `prisma generate`，`postinstall` 也会自动生成客户端。
7. **禁止 Google Fonts 外链**（大陆被墙）：字体通过 `next/font`（Geist）加载，CSS 变量 `--font-sans`。
8. **Next.js 16 有破坏性变更**：修改 `layout.tsx` / `page.tsx` / 路由相关代码前，**先读 `node_modules/next/dist/docs/`** 对应文档（`params`/`searchParams` 已是 Promise，类型化路由签名如 `LayoutProps<'/'>`）。
9. **生产部署底线（已上线实测 · 5 条红线）**：以下为真实服务器配置，**任何重装/迁移/重部署都必须严格沿用**，缺一不可：

   9.1 **Node.js >= 22.14.0**（实测 `v22.14.0`）。Node 20.x 在 `npm install` 时会触发 `EBADENGINE` + `better-sqlite3` 的 C++ 原生模块编译失败；Node 18 直接启动报错。**本地测试与生产构建前务必先确认 Node 版本**：`node -v` 必须 >= `v22.14.0`。

   9.2 **端口 = 3030**，启动命令：`npm run start -- -p 3030`。生产已改 3030 避开 3000 常见冲突。修改此端口会导致宝塔 Nginx 反代 502。

   9.3 **运行用户 = `root`**（在宝塔「Node 项目 → 设置」里改）。非 root 用户（默认 `www`）会因 `dev.db` 文件权限触发 `Permission Denied` / **`EACCES: ... dev.db-journal`** 500 报错。**真实生产踩坑**：仅把项目设置改 root 还不够——SQLite 在写库时会动态创建 `dev.db-journal` 锁文件并继承当前进程的 umask，经常出现「root 启动但锁文件权限不足」的二级错误。**额外需要对项目根目录执行 `chmod -R 777 .`**（或 `chown -R root:root .`）作为兜底，确保 `dev.db` 和 `dev.db-journal` 都可写。

   9.4 **Server Actions 来源白名单**：`next.config.ts` 中 `experimental.serverActions.allowedOrigins`。宝塔 Nginx 反代 HTTPS 请求时会把 `Host: wangshuyi.wangjicheng.com:443` 透传，而浏览器发起的 `Origin` 头是 `https://wangshuyi.wangjicheng.com`（无端口，443 是 HTTPS 隐式端口），两者不一致会触发 Next.js 16 CSRF/Origin 校验拒绝所有 Server Actions 请求，**报错关键词：``x-forwarded-host ... does not match origin ...``**。**绝对禁止**在重构 `next.config.ts` / `experimental` 时**删除或覆盖**以下两个域名：
      - `wangshuyi.wangjicheng.com`
      - `wangshuyi.wangjicheng.com:443`
      如需新增域名（如迁移到新域），**追加**到 `allowedOrigins` 数组，不要替换整段配置。

   9.5 **数据库保护**：`npm run pack` 严格排除 `dev.db` / `dev.db-journal`（见 `scripts/pack.mjs` 的 `EXCLUDE_FILES`）。增量部署流程：上传 `baobaoweinaiji/deploy.zip` → 解压 → `npm run build` → 重启 PM2，**绝不**手动 `rm dev.db`、**绝不**用 scp 把本地 `dev.db` 覆盖线上数据库。详细排障与部署步骤见 [BT_DEPLOY.md](BT_DEPLOY.md)；打包流程见 [README.md](README.md)。

10. **🚨 Prisma Schema 变更部署规约（2026-08-15 换尿布功能新增，硬性红线）**：任何涉及 `prisma/schema.prisma` 的改动（新增表/字段），本地开发侧的完整流程是「改 schema → **`npx prisma db push`**（本地建表）→ `npx prisma generate` → 写业务代码」。**交付时 AI 必须主动提醒用户服务器端的增量同步方案**：服务器解压新源码后、`npm run build` 之前，**必须先执行 `npx prisma db push`**——该命令只增量对齐线上 `dev.db` 的表结构、**不丢任何原有数据**；跳过则新功能一访问就报 **`no such table: ...`** 500。**绝对禁止**建议用户用 `rm dev.db` 删库重来同步结构。完整顺序：解压 → `npx prisma db push`（仅 schema 有变更时）→ `npm run build` → `pm2 restart baby-feeding-tracker`。详见 [BT_DEPLOY.md](BT_DEPLOY.md) Q9。

## [Production Gotchas · 排障速查]

> 上线后真实踩过的两类 500 报错。看到对应关键字时**直接按本表定位**。

| 报错关键词（看日志） | 根因 | 修复（按顺序执行） |
|---------------------|------|--------------------|
| **`EACCES: ... dev.db-journal`** / **`SQLITE_READONLY`** / `Permission Denied` | 进程用户对 `dev.db` 或 `dev.db-journal` 无写权限（宝塔默认 `www` 用户） | 1) 宝塔「Node 项目 → 设置」把**运行用户改为 `root`**；2) **额外**执行 `cd /www/wwwroot/baby-feeding-tracker && chmod -R 777 .`；3) `pm2 restart baby-feeding-tracker` |
| **`x-forwarded-host ... does not match origin ...`** | 宝塔 Nginx 反代把 `Host` 带 `:443` 透传，但浏览器 `Origin` 不带端口，触发 Next.js 16 CSRF 校验 | 在 `next.config.ts` 的 `experimental.serverActions.allowedOrigins` 中**追加**对应域名（带端口 + 不带端口两种形式都要）→ `npm run build` → 重启进程 |

> 改完配置必须**重启 PM2 进程**才生效（生产模式只读一次配置）；光刷新浏览器没用。

## [Future Roadmap]

> MVP 已完成。以下为**待办（Todo）**功能，按优先级排列，开发前需与产品负责人（王律）确认范围。

- [ ] **Todo**：按周/月统计总奶量、平均单次奶量、每日喂奶次数图表（可考虑引入轻量图表库）
- [ ] **Todo**：修改已有记录（编辑奶量/喂奶时间）
- [ ] **Todo**：删除记录（带二次确认，防误删）
- [ ] **Todo**：历史记录按天分组的时间轴展示（当前为平铺倒序列表）
- [ ] **Todo**：PWA 离线支持 + 添加到主屏幕（manifest + service worker）
- [ ] **Todo**：家庭成员多端**实时同步**（需引入登录/账号体系，从 SQLite 迁移到 Postgres）
- [ ] **Todo**：单条记录备注（如吐奶、拍嗝、大便情况等观察项）
