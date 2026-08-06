#!/usr/bin/env node
/**
 * 内容仓的结构校验。零依赖,`node lint.mjs` 直接跑。
 *
 * 这个仓只有一种形态,校验的就是它:
 *
 *     posts/<slug>/
 *       <slug>.<loc>.md    每个支持的语言**都必须有一个**,en 也不例外
 *       任意附件            必须被本目录的 md 引用到
 *
 * 三条硬规则(其余都是从它们派生的):
 *   1. **只有一层目录** —— 文章目录里不能再有子目录。
 *   2. **语言用后缀,且一个都不能少** —— 没有裸 `<slug>.md`;
 *      支持列表里有的语言,每篇文章都必须有对应文件。
 *      这条是**内容承诺**:声明支持某个语言,就不允许出现"这篇没翻"的空洞。
 *   3. **引用的附件必须在本目录内** —— 不许 `../`、不许绝对路径、
 *      不许指向别的文章目录。一篇文章连同它的图,搬走/删除都是一个目录的事。
 *
 * 为什么值得有这个 lint:这三条一旦破了,坏处都是**构建时才炸或者根本不炸**
 * (图片 404 上线了才发现)。结构约束在写的时候拦住最便宜。
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

/** 与 app 的 UI 语言一致(payload/locales.ts 的 BLOG_LOCALES)。 */
const LOCALES = ['en', 'zh', 'zh-HK', 'ja', 'ko', 'de', 'fr', 'es', 'pt', 'nl'];
const DEFAULT_LOCALE = 'en';
/** 仓根允许出现的非 posts 条目。 */
const ROOT_ALLOW = new Set(['posts', 'lint.mjs', 'README.md', '.git', '.github', '.gitignore']);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REQUIRED_FM = ['title', 'excerpt', 'publishedAt', 'draft'];

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

/** frontmatter 的极简解析 —— 只认 `key: value`,足够校验存在性和格式。 */
function frontmatter(raw, where) {
  if (!raw.startsWith('---\n')) {
    fail(where, '缺少 frontmatter(文件必须以 `---` 开头)');
    return null;
  }
  const end = raw.indexOf('\n---', 4);
  if (end === -1) {
    fail(where, 'frontmatter 没有闭合的 `---`');
    return null;
  }
  const out = {};
  for (const line of raw.slice(4, end).split('\n')) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1').trim();
  }
  return out;
}

/** md 里所有本地引用:图片 `![](x)`、链接 `[](x)`、以及 frontmatter 的 cover。 */
function localRefs(body) {
  const refs = [];
  for (const m of body.matchAll(/!?\[[^\]]*\]\(([^)\s]+)/g)) refs.push(m[1]);
  return refs.filter(
    (r) => !/^(https?:|mailto:|#|tel:)/i.test(r), // 外链不管
  );
}

function checkPost(dir) {
  const where = `posts/${dir}`;
  if (!SLUG_RE.test(dir)) {
    fail(where, '目录名必须是小写 kebab(它就是文章的 slug)');
  }
  const entries = readdirSync(join('posts', dir), { withFileTypes: true });

  // 规则 1:只有一层
  for (const e of entries) {
    if (e.isDirectory()) fail(where, `不允许子目录 \`${e.name}/\` —— 一篇文章就是一层目录`);
  }

  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const mds = files.filter((f) => f.endsWith('.md'));
  const assets = files.filter((f) => !f.endsWith('.md'));

  // 规则 2:每个语言一个文件,后缀命名,一个都不能少
  const seen = new Set();
  for (const md of mds) {
    const m = new RegExp(`^${dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.([\\w-]+)\\.md$`).exec(
      md,
    );
    if (!m) {
      fail(where, `\`${md}\` 命名不合法 —— 必须是 \`${dir}.<locale>.md\`(没有裸 \`${dir}.md\`)`);
    } else if (!LOCALES.includes(m[1])) {
      fail(where, `\`${md}\` 的语言 \`${m[1]}\` 不在支持列表:${LOCALES.join(', ')}`);
    } else {
      seen.add(m[1]);
    }
  }
  const missing = LOCALES.filter((l) => !seen.has(l));
  if (missing.length) {
    fail(where, `缺 ${missing.length} 个语言:${missing.join(', ')}`);
  }

  // 规则 3:引用的附件必须在本目录内 + frontmatter 完整
  const referenced = new Set();
  for (const md of mds) {
    const w = `${where}/${md}`;
    const raw = readFileSync(join('posts', dir, md), 'utf8');
    const fm = frontmatter(raw, w);
    if (fm) {
      for (const k of REQUIRED_FM) {
        if (!(k in fm)) fail(w, `frontmatter 缺 \`${k}\``);
      }
      if (fm.publishedAt && !/^\d{4}-\d{2}-\d{2}$/.test(fm.publishedAt)) {
        fail(w, `publishedAt 要写成 YYYY-MM-DD,现在是 \`${fm.publishedAt}\``);
      }
      if (fm.draft && !['true', 'false'].includes(fm.draft)) {
        fail(w, `draft 只能是 true / false,现在是 \`${fm.draft}\``);
      }
      if (fm.slug && !SLUG_RE.test(fm.slug)) {
        fail(w, `slug 覆盖必须是小写 kebab,现在是 \`${fm.slug}\``);
      }
      if (fm.cover) {
        referenced.add(fm.cover);
        if (!files.includes(fm.cover)) {
          fail(w, `cover \`${fm.cover}\` 不在本目录里`);
        }
      }
    }
    for (const ref of localRefs(raw)) {
      const decoded = decodeURIComponent(ref);
      if (decoded.startsWith('/') || decoded.includes('..') || decoded.includes('/')) {
        fail(w, `引用 \`${ref}\` 越出了本目录 —— 附件必须和 md 放在同一层`);
        continue;
      }
      referenced.add(decoded);
      if (!files.includes(decoded)) {
        fail(w, `引用的 \`${ref}\` 在本目录里不存在`);
      }
    }
  }

  // 没人引用的附件 = 白占仓库体积,而且多半是忘了删
  for (const a of assets) {
    if (!referenced.has(a)) {
      fail(where, `\`${a}\` 没有被任何 md 引用 —— 删掉它,或者在正文里用上`);
    }
  }
}

function main() {
  if (!existsSync('posts')) {
    fail('.', '仓根缺少 `posts/` 目录');
  } else {
    for (const e of readdirSync('.', { withFileTypes: true })) {
      if (!ROOT_ALLOW.has(e.name)) {
        fail('.', `仓根不该有 \`${e.name}\` —— 内容只放在 posts/ 下`);
      }
    }
    const entries = readdirSync('posts', { withFileTypes: true });
    for (const e of entries) {
      if (!e.isDirectory()) {
        fail('posts', `\`${e.name}\` 不是目录 —— posts/ 下只能是一篇文章一个目录`);
      }
    }
    for (const e of entries.filter((x) => x.isDirectory())) checkPost(e.name);
  }

  if (problems.length) {
    console.error(`✗ ${problems.length} 处不合规:\n`);
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }
  const n = existsSync('posts') ? readdirSync('posts').length : 0;
  console.log(`✓ ${n} 篇文章,结构合规`);
}

main();
