# 宝塔面板部署指南（Baby Feeding Tracker）

本指南手把手把「书熠的喂奶记录」部署到你的 Linux 服务器（宝塔面板），用 **宝塔「Node 项目」管理器跑 Node 程序 + 直接绑定域名**（无需手写 Nginx 反代），数据库用 SQLite。

> **✅ 推荐方案（生产实测）**：使用宝塔自带的「Node 项目」模块添加项目，它会**自动创建 PM2 进程 + 自动绑定域名 + 自动申请/续期 HTTPS 证书**，开箱即用。本指南以这个方案为主线写。

> 阅读对象：第一次在宝塔部署 Node 项目的人。每一步都写清楚了，照做即可。

---

## 📌 先看懂：我们用哪种部署方式，为什么

本项目用到的数据库驱动 `better-sqlite3` 是一个 **「原生模块（native module）」**——它包含一段用 C++ 编译出来的二进制代码，**和操作系统 + Node 版本绑定**。

**所以有一条铁律：**

> ❌ **不能**把 Windows 本地的 `node_modules` 文件夹直接上传到 Linux 服务器去用（里面的 `better-sqlite3` 是 Windows 版的，Linux 跑不起来）。
>
> ✅ **正确做法**：把**源码**上传到服务器，然后在**服务器上**执行 `npm install`（这一步会现场用 C++ 编译出 Linux 版的原生模块）+ `npm run build`。

本指南全程遵循这个正确做法。你不需要懂 C++，服务器会自动编译。

---

## 🧱 第一步：在宝塔装好运行环境

登录宝塔面板，进入 **「软件商店」**，安装以下软件（已装的可跳过）：

| 软件 | 作用 | 说明 |
|------|------|------|
| **Nginx** | 反向代理、对外提供网站 | 任意稳定版本即可 |
| **PM2 管理器**（或宝塔自带「Node 项目」） | 守护 Node 进程，开机自启、崩溃自动重启 | 推荐用宝塔「Node 项目」模块 |
| **Node.js 版本管理器** | 安装 Node 运行环境 | 用它装一个 **Node 22** |

> ⚠️ **Node 版本必须用 22 LTS 及以上**（生产实测 `v22.14.0` 完美运行）。本项目使用了最新的 Prisma 7 + `better-sqlite3`，在 Node 20.x 下安装时会触发 `EBADENGINE` 错误和 C++ 编译失败。**不要选 Node 18 或 Node 20**，否则 `npm install` / 启动都会报错。
>
> 在「Node.js 版本管理器」里安装 **Node 22.x** 并设为默认（命令行版本）。

### 还需要一组「编译工具」（编译原生模块用）

打开宝塔的 **「终端」**（面板右上角），根据你的系统粘贴执行其中**一行**：

```bash
# Ubuntu / Debian 系统：
apt update && apt install -y build-essential python3 make g++

# CentOS / RHEL / 阿里云系统：
yum groupinstall -y "Development Tools" && yum install -y python3
```

> 这一步只需做一次，装完就一直在。

---

## 📤 第二步：上传项目源码到服务器

### 2.1 在本地准备要上传的文件

把**整个项目文件夹 `baby-feeding-tracker`** 上传，但**排除**下面这些（它们要么体积大、要么会自动重新生成、要么是本地数据）：

| 排除（不要上传） | 原因 |
|------------------|------|
| `node_modules/` | 体积大，且 Windows 版不能在 Linux 用，服务器会重新装 |
| `.next/` | 构建产物，服务器会重新构建 |
| `src/generated/prisma/` | Prisma 自动生成的客户端，构建时会重新生成 |
| `.git/` | 版本库历史，部署不需要 |
| `dev.db`、`dev.db-journal` | 本地测试数据库，**不要覆盖线上数据** |

✅ **要上传**的核心内容：`src/`、`prisma/`、`public/`（如有）、`package.json`、`package-lock.json`、`next.config.ts`、`tsconfig.json`、`postcss.config.mjs`、`components.json`、`prisma.config.ts`、`.env.example`。

### 2.2 用宝塔「文件」功能上传

1. 宝塔面板 → **「文件」**。
2. 进入 `/www/wwwroot/`，新建文件夹 `baby-feeding-tracker`。
3. 把第一步准备好的文件（**按上表排除后**）上传到 `/www/wwwroot/baby-feeding-tracker/`。

> 小技巧：本地先把项目文件夹打个 zip（记得排除上面那几项），上传 zip 后在宝塔里「解压」，比逐个文件传快得多。

---

## 📦 第三步：在服务器安装依赖并构建

宝塔 → **「终端」**，依次执行（一行一行来，等上一条跑完再下一条）：

```bash
# 1) 进入项目目录（非常重要，后续所有命令都在这里执行）
cd /www/wwwroot/baby-feeding-tracker

# 2) 复制环境变量模板为正式的 .env 文件
cp .env.example .env

# 3) 安装依赖（这一步会现场编译 Linux 版的 better-sqlite3，可能要等 1~3 分钟）
npm install

# 4) 构建生产版本（会先自动生成 Prisma 客户端，再打包 Next.js）
npm run build
```

> ⚠️ 第 3 步 `npm install` **不要加** `--production` 或 `--omit=dev` 参数。本项目构建需要用到开发依赖（TypeScript、Tailwind、Prisma CLI 等），必须装完整依赖。

看到 `npm run build` 最后输出类似 `✓ Compiled successfully` / `Route (app) ...` 的表格，就说明构建成功了。

---

## 🗄️ 第四步：初始化数据库

仍在终端、仍在项目目录 `/www/wwwroot/baby-feeding-tracker` 下，执行：

```bash
npx prisma db push
```

这条命令会根据 `prisma/schema.prisma` 在项目根目录创建 `dev.db` 文件并建好「喂奶记录」表。

> 执行完后用 `ls -l dev.db` 应能看到这个文件，说明数据库就绪了。
>
> `.env` 里的 `DATABASE_URL="file:./dev.db"` 指向的就是它。

---

## 🚀 第五步：用 PM2 启动程序

### 方式 A（推荐）：宝塔「Node 项目」管理器（图形界面）

宝塔 → **「网站」→「Node 项目」**（或顶部菜单的「Node 项目」）→ **「添加 Node 项目」**，按下表填：

| 配置项 | 填写内容 |
|--------|----------|
| 项目目录 | `/www/wwwroot/baby-feeding-tracker` |
| Node 版本 | **22.x** |
| 包管理器 | npm |
| 启动方式 / 启动命令 | `npm run start -- -p 3030` |
| 端口 | `3030`（避开常见的 3000 冲突，已是生产配置） |
| 项目名称 | `baby-feeding-tracker`（随意） |
| **运行用户** | **`root`**（详见「常见问题 Q6」——非 root 用户会触发 `Permission Denied` 数据库读写 500） |

填好点 **「提交 / 启动」**。状态显示「运行中」即成功。

### 方式 B：终端用 PM2 命令（更通用）

```bash
cd /www/wwwroot/baby-feeding-tracker
pm2 start "npm run start -- -p 3030" --name baby-feeding-tracker
pm2 save            # 保存进程列表，开机自启
pm2 startup         # 设置开机自启（按提示执行它给的那一行命令）
```

常用查看命令：

```bash
pm2 list                          # 查看所有进程
pm2 logs baby-feeding-tracker     # 实时看日志（排查错误用）
pm2 restart baby-feeding-tracker  # 重启
```

### ✅ 这一步自检

终端执行（看程序是否在 3030 端口正常响应）：

```bash
curl http://127.0.0.1:3030
```

能看到一大段 HTML 输出（里面有「书熠的喂奶记录」字样）= 程序跑起来了 ✅。

---

## 🌐 第六步：绑定域名（HTTPS 一键搞定）

> ✅ **最简方案（生产实测推荐）**：宝塔「Node 项目」模块在「添加项目」时已经内置了「绑定域名」入口，**会自动创建 Nginx 反向代理 + 一键申请 Let's Encrypt 免费证书 + 自动续期**，根本不需要单独建 PHP 站点再手写反代。

操作步骤：

1. 回到「网站 → Node 项目」列表，点你的项目右侧 **「设置」**。
2. 切到 **「域名管理」** 标签页 → 点 **「添加域名」**：
   - **域名**：填你的真实域名（如 `feed.example.com`），勾选 **「同时添加 www」**（如需）；
   - 端口：默认 `3030`（与启动命令一致）。
3. 保存后，宝塔自动写入 Nginx 反代 + 上传 HTTP 验证文件。
4. 同页面点 **「Let's Encrypt」** 或 **「SSL 证书」** → **「申请」** → 签发后开启 **「强制 HTTPS」**。
5. 去你的**域名服务商**把 A 记录解析到这台服务器的公网 IP（如未解析）。

### 📦 备选方案：手动建站点 + Nginx 反代

如果你不想用宝塔「Node 项目」的域名绑定，也可以走传统路线（手建 PHP 站点再配反代）：

1. 宝塔 → **「网站」→「添加站点」**：
   - **域名**：填你的域名，例如 `feed.example.com`
   - 根目录：随便（用默认 `/www/wwwroot/...` 即可，**不是**项目目录）
   - PHP 版本：**纯静态**
   - 数据库：不创建
2. 站点建好后 → 点站点右侧 **「设置」→「反向代理」→「添加反向代理」**：
   - 代理名称：`feeding`
   - 目标 URL：`http://127.0.0.1:3030`
   - 发送域名：`$host`（默认）
   - 勾选「启用」→ 提交
3. 在该站点「设置」→ **「SSL」→「Let's Encrypt」**，免费申请证书并开启强制 HTTPS。

### ✅ 最终自检

浏览器打开 `https://你的域名/`，看到「书熠的喂奶记录」首页 + 倒计时 + 记录按钮 = 部署完成 🎉

---

## 🧩 附录：常用运维操作

| 场景 | 操作 |
|------|------|
| 看实时日志（排查 500/崩溃） | 终端 `pm2 logs baby-feeding-tracker` |
| 改了代码要更新 | 上传新源码 → `cd 项目目录 && npm install && npm run build && pm2 restart baby-feeding-tracker` |
| 备份数据库 | 定期复制 `/www/wwwroot/baby-feeding-tracker/dev.db` 到别处（SQLite 就是一个文件） |
| 重启程序 | `pm2 restart baby-feeding-tracker` |

---

## ❓ 常见问题排查

**Q1：`npm install` 报错，提到 `better-sqlite3` / `node-gyp` / `gyp ERR!`。**
A：缺少编译工具。回到「第一步」末尾，确认装了 `build-essential python3 make g++`（Ubuntu）或 `Development Tools python3`（CentOS），再重试。

**Q2：`npm run start` 或 PM2 启动后立刻退出，日志报 `Error: ... Node.js version`。**
A：Node 版本太低。在「Node.js 版本管理器」装并切换到 **Node 20**，PM2 项目里也选 20，再重启。

**Q3：网页打开是 502 Bad Gateway。**
A：Node 程序没起来或端口不对。先 `curl http://127.0.0.1:3000`，看是否返回 HTML；再看 `pm2 logs` 有无报错；确认反向代理目标 URL 是 `http://127.0.0.1:3000`。

**Q4：提示找不到数据库 / `dev.db` 路径不对。**
A：PM2 启动时的「工作目录」必须是项目根 `/www/wwwroot/baby-feeding-tracker`。终端方式请先 `cd` 进项目目录再 `pm2 start`；宝塔「Node 项目」会自动以项目目录为工作目录。`dev.db` 必须在这个目录下（第四步 `npx prisma db push` 生成）。

**Q5：提交喂奶后数据没保存 / 重启后数据丢失。**
A：确认程序是以**项目根目录**为工作目录运行的，这样 `dev.db` 才读写到正确位置。不要把工作目录设成别的文件夹。

**Q6：提交喂奶 / 加载首页时报 `500`，日志是 `SQLITE_READONLY` / `Permission Denied` / `EACCES: ... dev.db`。**
A：本项目（Prisma 7 + better-sqlite3）对数据库文件的读写权限非常敏感。宝塔「Node 项目」默认以 `www` 用户运行，对 `/www/wwwroot/baby-feeding-tracker/dev.db` 没有写权限。

> ✅ **解决办法**：在「Node 项目」项目设置里把**运行用户改为 `root`**（生产实测生效），或在终端把 `dev.db` 及其目录 `chmod 777` / `chown www:www`。**强烈建议直接切 root**——一行配置，省心。

**Q7（高发 · 提交任何表单都 500）：日志报 `x-forwarded-host ... does not match origin ...`**
A：Next.js 16 默认启用 CSRF/Origin 校验。宝塔 Nginx 反代 HTTPS 请求时会把 `Host: wangshuyi.wangjicheng.com:443` 透传到 Node 进程，而浏览器发起的 `Origin` 头是 `https://wangshuyi.wangjicheng.com`（HTTPS 隐式端口 443 不出现），两者不一致 → Next 拒绝 Server Actions。

> ✅ **解决办法**（已配置）：在 `next.config.ts` 的 `experimental.serverActions.allowedOrigins` 中加入「带端口 + 不带端口」两种域名：
>
> ```ts
> experimental: {
>   serverActions: {
>     allowedOrigins: [
>       "wangshuyi.wangjicheng.com",
>       "wangshuyi.wangjicheng.com:443",
>     ],
>   },
> }
> ```
>
> 改完后必须 `npm run build` + `pm2 restart baby-feeding-tracker` 才生效。**红线**：以后重构 `next.config.ts` / `experimental` 时**绝对不要删除或覆盖**这段配置；如需新增域名，**追加**到数组末尾即可。

**Q6.5（Q6 修完后还是 500）：日志是 `EACCES: ... dev.db-journal`**
A：仅把项目设置改 root 还不够。SQLite 在写库时会**动态创建** `dev.db-journal` 锁文件，并继承当前进程 umask —— 经常出现「进程是 root 启动，但锁文件被另一个用户先建出来导致权限不足」的二级错误。

> ✅ **解决办法**（生产实测兜底）：
>
> ```bash
> cd /www/wwwroot/baby-feeding-tracker
> chmod -R 777 .
> pm2 restart baby-feeding-tracker
> ```
>
> `chmod -R 777 .` 对项目根目录递归放开，确保 `dev.db` 和 `dev.db-journal` 任何时刻都可写。重新部署后**建议每次都跑一次**作为兜底。

**Q8：增量更新打包时，怎么保证数据库不丢？**
A：`npm run pack` 脚本（`scripts/pack.mjs`）的 `EXCLUDE_FILES` 已严格排除 `dev.db` / `dev.db-journal` / `.env`，生成的 zip 里**完全没有**数据库文件和真实环境变量。增量部署流程：

```bash
cd /www/wwwroot/baby-feeding-tracker
# 1) 上传新的 baobaoweinaiji/deploy.zip
# 2) 解压（zip 里没有 dev.db，所以数据库不会被覆盖）
unzip -o deploy.zip
# 3) 重新构建（让 next.config.ts / 新代码生效）
npm run build
# 4) 重启进程
pm2 restart baby-feeding-tracker
```

> **绝对禁止**：
> - `rm dev.db` 后再 `unzip`（除非你明确想清空数据）；
> - `scp` 把本地 `dev.db` 覆盖线上；
> - 修改 `scripts/pack.mjs` 的 `EXCLUDE_FILES` 把 `dev.db` 移除。

---

> 部署成功后，建议把服务器的 `dev.db` 定期备份（宝塔有「计划任务」可自动备份某个目录）。
