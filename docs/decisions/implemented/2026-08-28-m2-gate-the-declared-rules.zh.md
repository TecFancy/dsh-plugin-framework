# 该守的规则写成门禁脚本（M2）

## 决定了什么

把克制工程报告 M2「该守的规则，写成门禁脚本，不写成建议」落地到本仓库：

1. 新增 `scripts/verify-slice-boundaries.mjs`：跨 slice 导入只能走目标 slice 的 `index.ts`/`index.tsx` barrel；同层 slice 之间禁止互相导入（即使走 barrel）；根装配文件（`src/index.ts`、`src/client/index.tsx`）进入 slice 同样只能走 barrel；解析不到的导入直接判失败（fail-closed）。暴露为 `npm run slice:check`，接入 verify 链、lint-staged（`src/**`）与 CI。为此把既有 3 处根文件深导入（`features/hello-settings/api/*`、`shared/config/plugin-config`）改为走各自的 barrel。
2. commitlint 新增 `subject-english` 规则（经 plugin 注册）：subject 必须纯 ASCII（英文），非 ASCII 直接拒绝提交，不做静默改写。
3. `.husky/commit-msg` 的 AI 署名清除名单从 `Claude|Copilot` 扩展到 13 个常见 AI 工具，继续采用「提交时自动清除」策略（transformative gate），人类合著者不受影响。
4. AGENTS.md 新增 Gate coverage map：每条约定要么标注它所对应的机器门禁，要么显式归入「靠人检查」清单，不允许存在无声的建议。

## 背景

对照克制工程报告盘点本仓库时，发现三处「规则写在 AGENTS.md 里、但没有任何门禁」的缺口：barrel-only 导入面规则没有任何检查，而且现码本身就有 3 处深导入违规（根装配文件绕过 slice barrel）；`subject-case` 在 commitlint 里被显式禁用，英文主语完全靠自觉；AI 署名清除只覆盖 Claude/Copilot 两个名字。另外 eslint 的 no-restricted-paths 只能表达「层方向」，表达不了「同层 slice 互导」和「只允许 barrel」这类 slice 级结构。报告 §08 同时要求「门禁没覆盖到的地方要写下来」——所以门禁地图本身也是本次交付的一部分。

## 考虑过的替代方案

- **用 ESLint zone 规则表达 slice 边界** — zones 基于路径前缀匹配，能挡住一部分深导入，但「只能导入 index.ts」「同层 slice 互导」需要按 slice 枚举大量 zone，且与 resolver/alias 的交互容易漏检；表达力不足，维护成本高。
- **用 TS 编译器 API / ts-morph 写严格解析器** — 精确但依赖重、脚本长；本仓库的导入形态（相对路径、`.js`/`.ts`/`.tsx` 后缀、`client/*` alias、css module）用「正则提取 + 文件系统解析」即可完整覆盖，不需要编译级精度。
- **AI trailer 改为 commitlint 硬拒绝** — 理论更 fail-closed，但合法的人类合著者无法与 AI 自动区分，硬拒绝会误伤真实协作；自动清除的输出效果等价（历史永远干净）而摩擦为零。
- **不做门禁、继续靠自觉** — 与 M1 已确立的「规则要么能挡住人，要么就别写」直接矛盾，否决。

## 为什么这样选

「正则 + 文件系统解析」是覆盖当前导入形态的最轻实现，且 fail-closed（解析不到即失败）保证门禁不会静默放过未知形态；slice 以「最近的 barrel 所在目录」为根，天然把「每个 slice 必须有 barrel」也变成了可检查项。commitlint 自定义规则经 plugin 注册是官方机制，改动最小。自动清除而不是硬拒绝，是因为两者对历史产出的效果等价、而清除零摩擦。Gate coverage map 把「哪些规则没人管」写成显式清单，是报告 §08 的直接落地，避免假装全自动。
