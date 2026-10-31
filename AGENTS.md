# 博客内容 Agent 指南

## 写作与文件

- 开始前阅读 README.md；本仓只维护内容，页面与动画在 LandingPage。
- 每篇放在 `posts/<slug>/<slug>.<locale>.md`，齐备 en、zh、zh-HK、ja、ko、de、fr、es、pt、nl、it、ru 共 12 个版本。各版本保持相同核心事实、链接与分节顺序，用自然的当地语言表达。
- frontmatter 保留 title、excerpt、publishedAt、draft；实质内容修改才更新 updatedAt，纯排版调整不伪造更新时间。
- 核实版本、等级等事实，保留支持它们的来源；不要虚构亲测经验。产品额度和费用以当前产品为准。

## 正文分节：使用 ---

- 在完整章节或主题段落组之间放独立一行 `---`，上下各留一空行。通常置于新的二级标题 `##` 前；普通段落仍用空行，不在每个自然段之间重复插装饰。
- LandingPage 把正文横线 `<hr>` 渲染成两侧细线加蓝蛾动画。只写标题不会触发这个装饰。
- 12 个版本在相同逻辑位置使用分隔。不要放进列表、表格、引用或代码块；FAQ 小问题之间不必逐项插入。
- frontmatter 开头和结尾的 `---` 是元数据边界，不算正文分隔。

示例（正文）：

```markdown
读完这一节的说明。

---

## 下一节

继续正文。
```

## 配图（每篇必须有）

2026-10-31 起发布的文章**必须有封面**，lint 会拦。站点把它用在列表卡片、首屏和文章题图上，图下显示出处。用户的要求是「文人书店」的气质：配图要和文章主题对得上，色彩要丰富，不能全是花鸟风景。

### 1. 只用公有领域或 CC0

- `coverLicense` 只能填 `public-domain` 或 `CC0`。CC BY / CC BY-SA / 「仅限非商业」等一律不用 —— 它们要求的署名链接或相同方式共享，站点做不到。
- 只用**平面作品**（画、版画、地图、手稿、书页、刺绣）的忠实翻拍。不用现代摄影（摄影师自己有版权），不用 AI 生成的图。
- 授权以**来源页上机器可读的授权字段**为准，不凭印象。授权不明，或者页面信息互相矛盾，就换一张。

### 2. 去哪找

- **Wikimedia Commons**（首选）。用 API 搜，返回里直接带授权字段：

  ```
  https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&gsrsearch=<关键词>&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=1400&iiextmetadatafilter=LicenseShortName|Artist|DateTimeOriginal|Credit
  ```

  `LicenseShortName` 是 `Public domain` 就填 `public-domain`，是 `CC0` 就填 `CC0`，其它的跳过。下载用返回里的 `thumburl`（1400px 宽）。
- 博物馆开放馆藏也可以用：芝加哥艺术学院（`is_public_domain`）、美国国家美术馆（NGA）、克利夫兰美术馆（CC0）、荷兰国立博物馆（Rijksmuseum）、大都会艺术博物馆（Open Access）。同一件作品通常在 Commons 上也有。

### 3. 按主题挑，不按「好看」挑

- **语言类**（某门语言的书单、分级读物、学习路线）：配那门语言所属文化的作品。可以参考这些方向：
  - 中文：明清人物画、文人雅集；
  - 日语：浮世绘里读书、读信的人；
  - 韩语：金弘道等朝鲜风俗画；
  - 德语：丢勒、斯皮茨韦格、马尔克等德国画家；
  - 法语：马奈、弗拉戈纳尔等法国画家；
  - 西班牙语：索罗拉、委拉斯开兹；
  - 意大利语：威尼斯画派、文艺复兴；
  - 俄语：康定斯基、列维坦等俄国画家。
- **方法类**：配和主题对应的画面，比如读书的人、书房和图书馆、字母和识字课本、地图和地图集、书信、课堂。
- 画面里最好有**人、书、字、地图**这类能和文章挂上钩的东西，不要全是花鸟风景。优先选色彩丰富的作品：站点是象牙纸色底，黑白版画放上去显得灰。
- 已经用过的作品，在 `index.json` 的 `coverSource` 里能查到。**最近 20 篇不要重复用同一张。**
- 站点会把图裁成 3:2 的卡片和横幅：主体不要贴在边上，用 `coverFocus` 指定裁切焦点。

### 4. 记录出处

- `coverCredit`：写成 `作者, 作品名, 年份 · 馆藏`，用原文或英文名（博物馆惯例，12 个语言共用一份）。**年份和馆藏只写来源页上查得到的；查不到就不写，不要估。**
- `coverSource`：来源页的 URL（Commons 的 `File:` 页，或博物馆的藏品页），方便日后复查授权。

### 5. 处理文件

- 缩到 1000px 宽，jpg 质量约 72，不超过 400KB（lint 硬拦）。命名为 `cover.jpg`，放在本篇文章的目录里。

### 6. 填写 frontmatter（12 个语言文件都写，并且完全一致）

```yaml
cover: cover.jpg
coverCredit: "Johannes Vermeer, Woman Reading a Letter, c. 1662–63 · Rijksmuseum"
coverLicense: "public-domain"
coverSource: "https://commons.wikimedia.org/wiki/File:Vermeer,_Johannes_-_Woman_reading_a_letter_-_ca._1662-1663.jpg"
coverFocus: "center 35%"
category: "method"
```

完整示例见 `posts/lingq-alternatives/`（`cover.jpg` 和 12 个语言文件里的字段）。

`category` 是栏目，四选一：`lists`（书单、读物推荐）、`method`（阅读方法）、`tools`（工具比较、资源汇总）、`language`（学某门语言的路线）。

### 不要做

- **不要绕过网站的验证码或防机器人检查**（比如芝加哥艺术学院图片服务器的 Cloudflare 验证）。遇到 429 限流，就等一会儿重试，或者换一个来源。
- 请求头里不要放邮箱等个人信息。
- 不要用搜索引擎的缩略图，也不要用 Pinterest 这类转载站上的图：来源和授权都没法核实。

## 校验与发布

- 改完 Markdown 运行 `node lint.mjs --write`，然后 `node lint.mjs`；提交生成的 index.json，不手工编辑索引。
- 提交钩子会重新生成索引，不得跳过。检查 git diff，避免混入无关文件。
- dev 是预发、master 是生产；用户授权发布后再推对应分支，保留远端历史。
