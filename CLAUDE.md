# Claude 工作指南

开始操作前完整阅读并遵循仓根 [AGENTS.md](./AGENTS.md) 与 [README.md](./README.md)。

正文主题分节使用独立一行 `---`，上下留空行，触发蓝蛾动画分割装饰；不要在每个自然段之间加，也不要把 frontmatter 边界算作正文分隔。所有 12 个语言版本保持一致的逻辑分节位置。

每篇新文章都要配一张公有领域或 CC0 的名画做封面，并填写 `cover`、`coverCredit`、`coverLicense`、`coverSource`、`category`（12 个语言文件一致）。找图和核实授权的流程见 AGENTS.md「配图」，lint 会拦缺图的文章。

修改后运行 `node lint.mjs --write` 和 `node lint.mjs`，将 index.json 一并提交。发布分支按用户授权执行。
