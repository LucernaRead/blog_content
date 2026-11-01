# Claude 工作指南

开始操作前完整阅读并遵循仓根 [AGENTS.md](./AGENTS.md) 与 [README.md](./README.md)。

每个语言版本都从这门语言的读者出发写，不从一种语言翻译：标题、摘要和开头用 `transcreation` skill，写完 zh、zh-HK 用 `humanizer-zh`、其余语言用 `humanizer` 去 AI 腔。三个 skill 在 `.claude/skills/`，用法见 AGENTS.md「写法」。

正文主题分节使用独立一行 `---`，上下留空行（站点在这里切节，节间显示三个小圆点；题图和推广框插在第一个 `---` 之前）；不要在每个自然段之间加，也不要把 frontmatter 边界算作正文分隔。所有 12 个语言版本保持一致的逻辑分节位置。

写法照 AGENTS.md「版式与篇幅」：一句话一个意思，段落一到三句，摘要就是一句话简介，篇幅收着写；正文里的加粗会显示成鹅黄荧光笔划线，每小节只划 1–3 处书名、等级、关键数字；每小节最关键的一句用 `==高亮==`（淡蓝底，每节最多 1 处）。

每篇新文章都要配一张公有领域或 CC0 的名画做封面，并填写 `cover`、`coverCredit`、`coverLicense`、`coverSource`、`category`（12 个语言文件一致）。找图和核实授权的流程见 AGENTS.md「配图」，lint 会拦缺图的文章。

修改后运行 `node lint.mjs --write` 和 `node lint.mjs`，将 index.json 一并提交。发布分支按用户授权执行。
