# blog_content

Lucerna 博客的内容仓。**只放内容,不放代码** —— 站点在 `LandingPage` 仓里,
它在构建时把这里的 md 读进去。

## 写一篇文章

一篇文章 = **一个目录**,目录名就是它的网址:

```
posts/how-to-choose-your-first-book/
  how-to-choose-your-first-book.en.md   ← 英文正文(en 也带后缀,没有裸 .md)
  how-to-choose-your-first-book.zh.md   ← 中文
  ...                                   ← 支持的 12 个语言,一个都不能少
  hero.jpg                              ← 附件,所有语言共用
  chart.png
```

正文开头是 frontmatter:

```yaml
---
title: "How to choose your first book"
excerpt: "一句话摘要,列表页和分享卡片用它。"
publishedAt: "2026-08-06"
draft: false
cover: hero.jpg          # 可选,必须是本目录里的文件
---
```

引用图片就用**相对文件名**:

```markdown
![一张说明图](chart.png)
```

## 翻译

同一个目录里一个语言一个文件,**共用同一批附件**。

支持的语言,**一篇文章 12 个全都必须有**:

`en` `zh` `zh-HK` `ja` `ko` `de` `fr` `es` `pt` `nl` `it` `ru`

`en` 也要写 `.en.md` —— **没有裸 `<slug>.md`**。这条是 lint 硬拦的:
声明支持某个语言,就不允许出现"这篇没翻"的空洞。缺一个就提交不了。

某个语言想要自己的网址,在那个文件的 frontmatter 里写 `slug:`:

```yaml
slug: "tongguo-yuedu-xue-yingyu"
```

不写就跟目录名走。

## 三条硬规则

`node lint.mjs` 会挡住,CI 也会:

1. **只有一层目录** —— 文章目录里不能再有子目录。
2. **语言用后缀,而且一个都不能少** —— 没有裸 `<slug>.md`;支持列表里有的语言,每篇都必须有。
3. **引用的附件必须在本目录内** —— 不许 `../`、不许绝对路径、不许引别的文章的图。

第三条的意思是:**一篇文章连同它的图,搬走或删掉都只是一个目录的事。**
没有被任何 md 引用的附件也会被拦下 —— 那多半是忘了删。

## 分支

| 分支 | 去处 |
|---|---|
| `dev` | 预发环境 |
| `master` | 生产 |

## 本地检查

```bash
node lint.mjs            # 零依赖,不用 npm install。校验 + 检查 index.json 是否最新
node lint.mjs --write    # 校验 + 写出 index.json(改完 md 必须跑这个)
```

`index.json` 是站点渲染列表/分页读的那一个文件 —— 有它,列表页只取 1 次上游请求;
没它就得把每篇 md 都拉下来(而 GitHub 未鉴权 API 是 60 次/小时/IP)。
排序也在 lint 里定死(publishedAt 倒序,同日按目录名),不留给站点算。

**改完 md 忘了跑 `--write` 的话**,默认模式会比对出来并报错 —— 因为漂了的索引
会让站点显示旧标题旧顺序,而且不报任何错。

文章有实质内容更新时，在对应语言的 frontmatter 填写 `updatedAt: "YYYY-MM-DD"`（不早于 `publishedAt`），然后运行 `node lint.mjs --write`。站点 sitemap 与 Article 的更新时间均读取这个字段；未填写则沿用发布时间。
