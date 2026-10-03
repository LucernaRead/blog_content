#!/usr/bin/env node
/**
 * 内容仓的结构校验 **兼索引生成器**。零依赖,`node lint.mjs` 直接跑。
 *
 *     node lint.mjs            校验 + 检查 index.json 是否最新(CI 用,不写盘)
 *     node lint.mjs --write    校验 + 写出 index.json(本地写完文章用)
 *
 * 为什么索引由 lint 生成,而不是站点构建时算:
 * 站点是**运行时**从 GitHub 取内容的。没有索引的话,渲染一页列表要把每篇文章的
 * md 都拉下来才知道标题和日期 —— 上游请求是 O(文章数),而 GitHub 未鉴权 API
 * 只有 60 次/小时/IP。有了索引,列表页只取 **1 个文件**。
 *
 * ⚠️ 索引会**漂移**:有人改了 md 却没跑 lint,index 里还是旧标题旧顺序,
 * 站点列表和实际内容对不上,而且不报任何错。所以默认模式会**比对**重新生成的
 * 结果和仓库里的 index.json,不一致直接红 —— 让"忘了跑"在 PR 上被拦住。
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
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

/** 与 app 的 UI 语言一致(payload/locales.ts 的 BLOG_LOCALES)。 */
const LOCALES = ['en', 'zh', 'zh-HK', 'ja', 'ko', 'de', 'fr', 'es', 'pt', 'nl', 'it', 'ru'];
const DEFAULT_LOCALE = 'en';
/** 仓根允许出现的非 posts 条目。 */
const ROOT_ALLOW = new Set([
  'posts',
  // 落地页的 FAQ 文案 —— 站点文案和文章一样,push 即发布,不进前端 bundle。
  // 形态:faq/<locale>.md,frontmatter 带 section 标题,`## ` 是问题,下面是答案。
  'faq',
  'lint.mjs',
  'index.json',
  'README.md',
  'AGENTS.md',
  'CLAUDE.md',
  '.git',
  // husky 的钩子 + 它要的 package.json / lockfile / node_modules。
  //
  // 这个仓的 CI 刻意不跑 `npm install`(lint.mjs 零依赖,runner 自带的 node
  // 就够)。那说的是 **CI 不需要 npm**,不是「仓里不许有 package.json」——
  // 本地提交时跑 husky 和 CI 里裸跑 node 互不冲突。
  '.husky',
  'package.json',
  'package-lock.json',
  'node_modules',
  '.github',
  '.gitignore',
]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const INDEX_FILE = 'index.json';
const REQUIRED_FM = ['title', 'excerpt', 'publishedAt', 'draft'];

const problems = [];
const fail = (where, msg) => problems.push(`${where}: ${msg}`);

/** 索引条目:站点渲染列表 / 分页所需的**全部**字段。
 * 原则是"列表页不需要再取任何 md" —— 少一个字段就会退回 O(N) 的取数。 */
const index = [];

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

/** 读某个语言文件的 frontmatter。读不到就返回空对象 —— 缺文件的情况
 * 上面的规则 2 已经报过了,这里不重复报。 */
function readFrontmatterOf(dir, locale) {
  try {
    return frontmatter(readFileSync(join('posts', dir, `${dir}.${locale}.md`), 'utf8'), '') ?? {};
  } catch {
    return {};
  }
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
  /** 这篇文章各语言的元数据,收集起来进索引。 */
  const byLocale = {};
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
      if (fm.updatedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(fm.updatedAt) || Number.isNaN(Date.parse(fm.updatedAt)) || fm.updatedAt < fm.publishedAt)) {
        fail(w, 'updatedAt 必须是有效的 YYYY-MM-DD，且不早于 publishedAt');
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
      const loc = md.slice(dir.length + 1, -3);
      if (LOCALES.includes(loc)) {
        byLocale[loc] = {
          // slug 默认就是目录名;只有 frontmatter 覆盖过才不同。
          slug: fm.slug || dir,
          title: fm.title ?? '',
          excerpt: fm.excerpt ?? '',
          draft: fm.draft === 'true',
          ...(fm.updatedAt ? { updatedAt: fm.updatedAt } : {}),
        };
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

  // 收进索引。publishedAt / cover 不随语言变,取默认语言那份。
  const base = readFrontmatterOf(dir, DEFAULT_LOCALE);
  index.push({
    dir,
    publishedAt: base.publishedAt ?? '',
    cover: base.cover || null,
    locales: byLocale,
  });

  // 没人引用的附件 = 白占仓库体积,而且多半是忘了删
  for (const a of assets) {
    if (!referenced.has(a)) {
      fail(where, `\`${a}\` 没有被任何 md 引用 —— 删掉它,或者在正文里用上`);
    }
  }
}

/** FAQ 目录:只许 `<locale>.md`,10 个语言一个都不能少(和 posts 同一条
 *  内容承诺)。每个文件:frontmatter 带 `title`(板块标题),正文里
 *  `## ` 开头的是问题,到下一个 `## ` 之间是答案。 */
function checkFaq() {
  const where = 'faq';
  if (!existsSync('faq')) {
    fail(where, '缺少 faq/ 目录');
    return;
  }
  const entries = readdirSync('faq', { withFileTypes: true });
  const seen = new Set();
  for (const e of entries) {
    if (e.isDirectory()) {
      fail(where, `不允许子目录 \`${e.name}/\``);
      continue;
    }
    const m = /^([\w-]+)\.md$/.exec(e.name);
    if (!m || !LOCALES.includes(m[1])) {
      fail(where, `\`${e.name}\` 命名不合法 —— 必须是 \`<locale>.md\``);
      continue;
    }
    seen.add(m[1]);
    const raw = readFileSync(join('faq', e.name), 'utf8');
    const fm = frontmatter(raw, `${where}/${e.name}`);
    if (fm && !fm.title) fail(`${where}/${e.name}`, 'frontmatter 缺 `title`(板块标题)');
    const bodyStart = raw.indexOf('\n---');
    const body = bodyStart === -1 ? raw : raw.slice(bodyStart);
    if (!/^## .+/m.test(body)) {
      fail(`${where}/${e.name}`, '没有任何 `## ` 问题 —— FAQ 至少一问');
    }
  }
  const missing = LOCALES.filter((l) => !seen.has(l));
  if (missing.length) fail(where, `缺 ${missing.length} 个语言:${missing.join(', ')}`);
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
  checkFaq();

  if (problems.length) {
    console.error(`✗ ${problems.length} 处不合规:\n`);
    for (const p of problems) console.error('  ' + p);
    process.exit(1);
  }

  // ── 索引 ──────────────────────────────────────────────────────────
  // 站点靠这个文件渲染列表和分页,所以**排序在这里定死**,而不是留给站点。
  // 按 publishedAt 倒序;同一天的用目录名兜底 —— 没有 tiebreak 的话,
  // 同日发布两篇时顺序会随目录列表的返回顺序漂,列表页时不时换位置。
  index.sort((a, b) =>
    a.publishedAt === b.publishedAt
      ? a.dir.localeCompare(b.dir)
      : a.publishedAt < b.publishedAt
        ? 1
        : -1,
  );
  const json = JSON.stringify({ generatedBy: 'lint.mjs', posts: index }, null, 2) + '\n';

  if (process.argv.includes('--write')) {
    writeFileSync(INDEX_FILE, json);
    console.log(`✓ ${index.length} 篇文章,结构合规;已写出 ${INDEX_FILE}`);
    return;
  }

  const current = existsSync(INDEX_FILE) ? readFileSync(INDEX_FILE, 'utf8') : null;
  if (current !== json) {
    console.error(
      `✗ ${INDEX_FILE} 不是最新的 —— 改完 md 要跑 \`node lint.mjs --write\`。\n` +
        '  (不拦住的话:站点列表读的是旧标题旧顺序,而且不会报任何错。)',
    );
    process.exit(1);
  }
  console.log(`✓ ${index.length} 篇文章,结构合规;${INDEX_FILE} 最新`);
}

main();
