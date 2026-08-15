#!/usr/bin/env node
/**
 * 一键打包脚本：把当前项目拷贝到系统临时目录中的 staging 文件夹，
 * 打包成 deploy.zip，输出到项目父目录（baobaoweinaiji/deploy.zip）。
 *
 * 严格排除（不能进 zip）：
 *   - node_modules、.next、.git、.claude/.agents/.windsurf
 *   - dev.db 及任何 *.db / *.db-journal（线上数据库，绝不能覆盖）
 *   - src/generated/prisma（构建时 prisma generate 重新生成）
 *   - *.tsbuildinfo、next-env.d.ts
 *   - skills-lock.json
 *   - 本脚本本身
 *
 * 跨平台：
 *   - Windows: PowerShell Compress-Archive
 *   - Linux/macOS: zip（fallback: tar.gz）
 *
 * 用法：
 *   npm run pack
 */

import { existsSync, rmSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import { execFileSync, execSync } from 'node:child_process';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
// staging 走系统临时目录，避免污染项目目录
const DEPLOY_DIR = join(tmpdir(), `baby-feeding-tracker-pack-${Date.now()}`);
// 唯一产物：项目父目录下的 deploy.zip（baobaoweinaiji/deploy.zip）
const OUTPUT_ZIP = join(ROOT, '..', 'deploy.zip');
// fallback（Linux 无 zip 命令时）：同目录
const OUTPUT_TAR = join(ROOT, '..', 'deploy.tar.gz');

const EXCLUDE_DIRS = new Set([
  'node_modules', '.next', '.git',
  '.claude', '.agents', '.windsurf',
  // 历史 pack.mjs 留下的本地 staging 目录（万一没及时清理，避免被打进 zip）
  'baby-feeding-tracker-deploy',
  // src/generated/ 整个目录都是 Prisma 生成的，服务器 prisma generate 会重建
  'generated',
  'scripts', // 打包脚本不进 zip（仅本地用）
]);
const EXCLUDE_FILES = new Set([
  // 数据库文件（绝不能覆盖线上）
  'dev.db', 'dev.db-journal',
  // 本地 .env（绝不能覆盖服务器的 .env；.env.example 保留）
  '.env',
  // 构建缓存 / AI 工具配置
  'tsconfig.tsbuildinfo', 'next-env.d.ts',
  'skills-lock.json',
]);
const EXCLUDE_SUFFIX = ['.tsbuildinfo'];

function shouldExclude(name, fullRel) {
  if (EXCLUDE_DIRS.has(name)) return true;
  if (EXCLUDE_FILES.has(name)) return true;
  if (fullRel && fullRel.startsWith('src/generated/')) return true;
  return EXCLUDE_SUFFIX.some((s) => name.endsWith(s));
}

function copyTree(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const rel = relative(ROOT, join(src, entry.name));
    if (shouldExclude(entry.name, rel)) continue;
    const s = join(src, entry.name);
    const d = join(dst, entry.name);
    if (entry.isDirectory()) {
      copyTree(s, d);
    } else if (entry.isFile()) {
      // 用 read+write 替换 cpSync，避开 Node 24 在 Windows 长路径下 cpSync 的 unlink bug
      try {
        writeFileSync(d, readFileSync(s));
      } catch (err) {
        console.warn(`  ! 跳过（copy 失败）: ${rel} - ${err.message}`);
      }
    } else if (entry.isSymbolicLink()) {
      try {
        // 符号链接：原样复制内容，不跟随
        writeFileSync(d, readFileSync(s));
      } catch (err) {
        console.warn(`  ! 跳过（symlink）: ${rel}`);
      }
    }
  }
}

function bytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function log(step, msg) {
  console.log(`[${step}] ${msg}`);
}

/**
 * 删除目录（彻底，包括隐藏文件 .env）。
 * Node 的 rmSync 在 Windows 上对 .env 这类点文件会失败，
 * 所以 Windows 下用 PowerShell Remove-Item（兼容 hidden/system 文件）。
 */
function cleanDir(dir) {
  if (!existsSync(dir)) return;
  if (process.platform === 'win32') {
    try {
      execSync(`powershell -NoProfile -Command "Remove-Item -LiteralPath '${dir}' -Recurse -Force"`, {
        stdio: 'ignore',
      });
    } catch {
      rmSync(dir, { recursive: true, force: true });
    }
  } else {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------- Step 1: 拷贝到 staging 目录（系统临时目录） ----------
log('1/3', `拷贝项目 → ${DEPLOY_DIR}`);
cleanDir(DEPLOY_DIR);
copyTree(ROOT, DEPLOY_DIR);
log('1/3', `已拷贝 ${readdirSync(DEPLOY_DIR).length} 个顶层条目`);

// ---------- Step 2: 打包 ----------
log('2/3', `打包 → ${OUTPUT_ZIP}`);
if (existsSync(OUTPUT_ZIP)) rmSync(OUTPUT_ZIP);
if (existsSync(OUTPUT_TAR)) rmSync(OUTPUT_TAR);

const platform = process.platform;
let archivePath = OUTPUT_ZIP;

if (platform === 'win32') {
  // Windows: 用 PowerShell Compress-Archive。
  // 中文路径在 PowerShell 原生命令行下能直接处理，
  // 但从 Git Bash 通过 execSync 传入时会出现路径编码问题，
  // 所以通过临时 .ps1 文件中转，且必须用 UTF-8 BOM 让 PowerShell
  // 正确识别编码（否则 GBK 解读会把「橘子汽水」弄乱）。
  const psBody = [
    `# 先切到 UTF-8 编码，避免中文路径被 GBK 解读乱`,
    `[Console]::InputEncoding = [System.Text.Encoding]::UTF8`,
    `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8`,
    `$OutputEncoding = [System.Text.Encoding]::UTF8`,
    `chcp 65001 | Out-Null`,
    `$ErrorActionPreference = 'Stop'`,
    `$src = '${DEPLOY_DIR.replace(/'/g, "''")}'`,
    `$dst = '${OUTPUT_ZIP.replace(/'/g, "''")}'`,
    `if (Test-Path -LiteralPath $dst) { Remove-Item -LiteralPath $dst -Force }`,
    `Compress-Archive -Path (Join-Path $src '*') -DestinationPath $dst -CompressionLevel Optimal -Force`,
    `Write-Output ('size:' + (Get-Item -LiteralPath $dst).Length)`,
  ].join('\r\n');
  const tmpPs = join(tmpdir(), `pack-${Date.now()}.ps1`);
  // UTF-8 BOM 让 PowerShell 自动按 UTF-8 解析脚本
  const bom = Buffer.from([0xef, 0xbb, 0xbf]);
  const body = Buffer.from(psBody, 'utf8');
  writeFileSync(tmpPs, Buffer.concat([bom, body]));
  try {
    const out = execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', tmpPs], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    log('2/3', `PowerShell: ${out.trim()}`);
  } finally {
    rmSync(tmpPs, { force: true });
  }
} else {
  // Linux / macOS: 优先用 zip，缺失则用 tar.gz
  try {
    execFileSync('zip', ['-r', '-q', OUTPUT_ZIP, '.'], { cwd: DEPLOY_DIR });
    log('2/3', 'zip 命令成功');
  } catch {
    log('2/3', 'zip 命令不可用，回退到 tar.gz');
    archivePath = OUTPUT_TAR;
    execFileSync('tar', ['-czf', OUTPUT_TAR, '.'], { cwd: DEPLOY_DIR });
  }
}

if (!existsSync(archivePath)) {
  console.error('❌ 打包失败：未生成产物');
  cleanDir(DEPLOY_DIR);
  process.exit(1);
}

// ---------- Step 3: 清理 staging ----------
log('3/3', '清理临时目录');
cleanDir(DEPLOY_DIR);

const size = statSync(archivePath).size;
console.log(`\n✅ 打包完成`);
console.log(`   ${relative(join(ROOT, '..'), archivePath).padEnd(28)} ${bytes(size)}`);
console.log(`\n📤 下一步：把 deploy.zip 上传到服务器 ${'/www/wwwroot/baby-feeding-tracker/'} 并解压。`);