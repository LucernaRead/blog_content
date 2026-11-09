#!/usr/bin/env node
/**
 * Put a cover on posts: copy the image into the post directory and write the cover fields into all
 * 12 language files at once (lint requires them identical). Zero dependencies.
 *
 *     node set-cover.mjs <manifest.json> [categories.json]
 *
 * categories.json (optional): { "<slug>": "<category>" } — fills `category` for entries that do not carry one.
 *
 * manifest.json: { "<slug>": { "image": "<path to the prepared jpg>", "credit": "…", "license": "public-domain" | "CC0",
 *                  "source": "https://…", "focus": "center 30%", "category": "lists" | "method" | "tools" | "language" } }
 * `image` is relative to the manifest's directory; when omitted it is `<slug>/cover.jpg` there.
 * Prepare the image first (AGENTS.md, "配图": 1000 px wide, ~q72, ≤ 400 KB). Then run `node lint.mjs --write`.
 */
import { copyFileSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const KEYS = ['cover', 'coverCredit', 'coverLicense', 'coverSource', 'coverFocus', 'category'];

const manifestPath = process.argv[2];
if (!manifestPath) {
  console.error('usage: node set-cover.mjs <manifest.json>');
  process.exit(2);
}
const base = dirname(resolve(manifestPath));
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const categories = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : {};

for (const [slug, c] of Object.entries(manifest)) {
  const dir = join('posts', slug);
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  if (files.length === 0) throw new Error(`${dir}: no language files`);
  const values = {
    cover: 'cover.jpg',
    coverCredit: c.credit,
    coverLicense: c.license,
    coverSource: c.source,
    coverFocus: c.focus,
    category: c.category ?? categories[slug],
  };
  for (const [k, v] of Object.entries(values)) if (!v) throw new Error(`${slug}: missing ${k}`);
  copyFileSync(resolve(base, c.image ?? join(slug, 'cover.jpg')), join(dir, 'cover.jpg'));
  const lines = KEYS.map((k) => (k === 'cover' ? `cover: ${values[k]}` : `${k}: ${JSON.stringify(values[k])}`));
  for (const f of files) {
    const path = join(dir, f);
    const raw = readFileSync(path, 'utf8');
    const end = raw.indexOf('\n---', 4);
    if (!raw.startsWith('---\n') || end === -1) throw new Error(`${path}: no frontmatter`);
    // Drop any earlier cover lines, then put the full set at the end of the frontmatter.
    const kept = raw
      .slice(4, end)
      .split('\n')
      .filter((l) => !KEYS.some((k) => l.startsWith(`${k}:`)));
    writeFileSync(path, `---\n${[...kept, ...lines].join('\n')}${raw.slice(end)}`);
  }
  console.log(`${slug}: cover + ${files.length} files`);
}
