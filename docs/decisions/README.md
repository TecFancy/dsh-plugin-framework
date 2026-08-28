# 决策记录

这是 [M1（决策记录生命周期）](../restraint-engineering-report.md#m1--决策记录是有生命周期的不是一次性文档)的落地版本：三个状态目录 + 双语（`.zh.md`/`.en.md`）成对记录。双语是刻意保留的完整性要求，不是可选简化——取舍经过在 [2026-08-28-add-format-gate-and-bilingual](./implemented/2026-08-28-add-format-gate-and-bilingual.zh.md) 里。

## 状态

每条记录的状态由它所在的文件夹表达，不写在文件内容里：

- `proposed/` — 提出但还没落地的决定。
- `implemented/` — 已经落地，正文用现在时描述"决定了什么"。
- `archived/` — 已冻结的历史记录。

状态变化是移动文件（改路径），不是编辑内容里的某个字段。

## 什么时候该写一条

不是每次改动都要写。只有当一个决定：

- 有至少一个被认真考虑过、又放弃的替代方案，或
- 三个月后如果没有这条记录，后来的人（人或 AI）会重新犯一遍已经想清楚的错

才值得写。日常的、显而易见的改动不需要。

## 什么时候该归档

**不靠字数，不靠时间。** 唯一的判据是：_未来的人还需不需要靠它来做决定_。

两个校准例子（来自原始分析对象 DSH 仓库，可作参考）：

- 一条 248 词的记录被保留：它是基础性的权威说明，后来的人还得靠它判断类似的情况。
- 一条 1,498 词的记录被归档：它只是一次实现细节的说明，对未来的决策没有指导价值。

短的可能该留，长的可能该归档——反过来也一样。判断的时候问自己："如果这条记录消失，未来会有人因此做错决定吗？"

## 归档 = 冻结

一旦移进 `archived/`：

- 不再编辑正文，哪怕发现了笔误。
- 不再修复失效链接。
- 只能被新记录引用为"当时的决定"，不能被当作仍然成立的规范。

如果内容已经不适用了，写一条新记录说明现状，并链接回被取代的那条，而不是回去改旧记录。

## 命名

`{状态文件夹}/YYYY-MM-DD-简短主题.{zh|en}.md`，例如 `implemented/2026-08-28-decision-record-lifecycle.zh.md`。

## 双语

`implemented/` 和 `archived/` 下的每条记录必须同时有 `.zh.md` 和 `.en.md` 两个文件，内容对应同一个决定。`proposed/` 阶段允许只写一种语言——先把想法定下来，等确定要落地再补齐另一种语言。这一点在 [2026-08-28-add-format-gate-and-bilingual](./implemented/2026-08-28-add-format-gate-and-bilingual.zh.md) 里有完整的取舍说明。

## 强制执行

不靠自觉，靠脚本：`scripts/verify-decision-records.mjs` 会检查文件名格式、必需章节、双语是否配对、以及归档记录是否被改动过。

```
npm run decisions:check
```

检查已接入三条链路，改到决策记录文件时都会被挡住：

- `lint-staged`（`.lintstagedrc.js`）：staged 里出现 `docs/decisions/**` 时自动全量跑一次
- `npm run verify`：完整门禁链的一部分
- CI（`.github/workflows/ci.yml`）：独立的 `decisions:check` 步骤

## 归档冻结怎么校验

`archived/.manifest.json` 记录每个归档文件的内容哈希，只允许追加，不允许改动或删除已登记的条目——这是对 M1 里"归档=冻结"规则的机械化。新归档一条记录后，运行：

```
node scripts/verify-decision-records.mjs --update-manifest
```

把新文件的哈希登记进清单。之后再改动这个文件，检查就会失败。

## 模板

新建记录时复制 [`_template.zh.md`](./_template.zh.md) 和 [`_template.en.md`](./_template.en.md)。
