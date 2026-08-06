# blog_content

Lucerna 博客的内容仓。**只放内容,不放代码** —— 站点在 `LandingPage` 仓里,
它在构建时把这里的 md 读进去。

## 写一篇文章

一篇文章 = **一个目录**,目录名就是它的网址:

```
posts/how-to-choose-your-first-book/
  how-to-choose-your-first-book.md      ← 正文,文件名和目录名一样
  hero.jpg                              ← 附件,和正文放在一起
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

同一个目录里加后缀文件,**共用同一批附件**:

```
posts/how-to-choose-your-first-book/
  how-to-choose-your-first-book.md      ← 英文(默认)
  how-to-choose-your-first-book.zh.md   ← 中文
  hero.jpg
```

支持的语言:`en`(默认,不写后缀) `zh` `zh-HK` `ja` `ko` `de` `fr` `es` `pt` `nl`。

某个语言想要自己的网址,在那个文件的 frontmatter 里写 `slug:`:

```yaml
slug: "tongguo-yuedu-xue-yingyu"
```

不写就跟目录名走。

## 三条硬规则

`node lint.mjs` 会挡住,CI 也会:

1. **只有一层目录** —— 文章目录里不能再有子目录。
2. **语言用后缀**,不是子目录、不是并列目录。
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
node lint.mjs      # 零依赖,不用 npm install
```
