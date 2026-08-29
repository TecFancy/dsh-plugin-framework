# 门禁按场景拼装，本地只跑最小证据集（M3）

## 决定了什么

把克制工程报告 M3「CI 不是一键跑全部，是按场景拼装的门禁图」落地到本仓库，但按仓库规模做了轻量版（不照抄 DSH 的 968 行调度器）：

1. 新增 `scripts/run-gates.mjs`：把同一套 11 个 gate 组织成 5 个命名场景（`hygiene` / `types` / `tests` / `build` / `verify`=全量），暴露为 `npm run gates`。
2. 自动推断：不带参数时扫描变更面（`git diff --name-only <base>`，默认 `HEAD`），按「改动文件 → 场景」的显式规则表归并出最小证据集；**fail-closed**——依赖变更、未知文件形态、非 git 环境一律回退全量，绝不弱化。`--scenario <name>` 可强制指定，`--list` 打印场景表。
3. `.husky/pre-push` 从「只跑 type-check」改为 `npm run gates -- --base @{u}`：一次覆盖「未 push 的 commits + 未提交的改动」，推之前必过覆盖本次改动面的最小证据集。
4. CI 把单 job 串 11 步的巨石 `verify` 拆成三个窄职责并行 job（`hygiene` / `quality` / `build`），各自在双 OS matrix 上跑自己的全量子集；**不引入 path filter**（避免「某 job 没跑」的静默缺口）。
5. `npm run verify` 原样保留为全量门禁（CI 与发布用），AGENTS.md 明确标注「full set - CI and release; not every local run」。

## 背景

现状是「verify 一键跑全部」：改一行文档也要付 type-check + coverage + build 的成本（本地 30 秒+），而 pre-push 又只跑 type-check——改 src 不跑 lint/slice 就能推上去，覆盖不足与成本过重同时存在。报告 M3 的口径很直白：**提交或推送前不默认跑全套，只选覆盖了这次改动面的最小证据集，全量覆盖是 CI 的事**；映射表给出的对应方案是「明确区分本地 pre-push 最小集与 CI 完整集，本地永远不跑全套」。

## 考虑过的替代方案

- **照抄 DSH 的 `run-gates.ts`（968 行、15 个场景、并发上限）** — 我们只有 11 个 gate、单仓库单包，并发调度器解决的是「本地同时跑 4 个 tsc 编译被拖死」这种问题，当前规模不存在；复杂度是净负担。
- **pre-push 直接改跑 `npm run verify`** — 覆盖够了，但违背「本地不跑全套」原则：push 一次 30 秒+，人会学会计较成本然后绕过（`--no-verify`、少 push 多堆积）。
- **只在 CI 层用 path filter 拆 workflow，本地不动** — 本地体验和 pre-push 覆盖不足依旧，等于只做了一半。
- **自动推断 + 命名场景（选定）** — 本地默认最小集，`--scenario` 保留手动逃生口，未知形态回退全量保底。

## 为什么这样选

推断规则是显式表：每个文件形态对应场景，取并集执行，规则无法覆盖的形态（新文件类型、依赖变更）直接回退全量——自动化的前提是「可以漏跑但绝不漏检」。pre-push 用 `@{u}` 作 base，一次覆盖未 push 的 commits 与未提交的改动，且无 upstream 时自动回退 `HEAD`。CI 拆三 job 是为了并行与失败定位，刻意不引入 path filter：小仓库全量覆盖只要十几秒，省下的等价于「部分覆盖的静默风险」，不值当。`verify` 保留为权威全量，`gates` 是日常路径，两条腿各司其职。
