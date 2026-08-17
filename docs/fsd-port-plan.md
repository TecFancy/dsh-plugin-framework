# fsd-react → dsh 插件开发通用框架 移植方案

> 目标仓库(建议路径):`D:\source\personal\dsh-plugin-framework`
> 源架构参考:`D:\source\personal\fsd-react`(common 分支)
> 约束来源:dsh(DeepSeek Harness)Cordis 插件开发规范 + `dsh-deeptutor`(host-only)+ `dshmarket`(client UI)+ `@deepseek-ai/dsh-client-modules` 加载契约 + `dsh-auth-gate`(现有插件工程形态对比)

本文档只描述"如何把 fsd-react 的架构纪律移植成一个可复用的 dsh 插件脚手架框架"，不描述对 `dsh-auth-gate` 本身的改造方案(该仓库仅作为第 9 节的映射演练用例)。

---

## 目录

1. [框架定位与总体思路](#1-框架定位与总体思路)
2. [框架仓库的目标目录结构](#2-框架仓库的目标目录结构)
3. [内置示例插件设计](#3-内置示例插件设计)
4. [分层依赖规则](#4-分层依赖规则)
5. [路径别名与工程门禁](#5-路径别名与工程门禁)
6. [从 fsd-react 提取的可复用资产清单](#6-从-fsd-react-提取的可复用资产清单)
7. [分阶段搭建步骤](#7-分阶段搭建步骤)
8. [从框架起步开发新插件的标准流程](#8-从框架起步开发新插件的标准流程)
9. [验证用例：dsh-auth-gate 映射演练](#9-验证用例dsh-auth-gate-映射演练)
10. [风险与权衡](#10-风险与权衡)

---

## 1. 框架定位与总体思路

### 1.1 仓库与命名

- **仓库路径**：`D:\source\personal\dsh-plugin-framework`（本仓库当前状态）。
- **仓库性质**：不是一个会被 `npm install` 的运行时依赖包，而是一个**模板仓库**——新插件通过复制/`degit` 起步，改名后独立演化。因此本仓库自身不需要发布到 npm registry，但仓库根 `package.json` 本身就是"新插件 package.json 的第一份草稿"，两者同源。
- **备选仓库名**：`dsh-plugin-template`（强调模板属性）、`create-dsh-plugin`（如果未来想做成 `npm create` 风格的 CLI 生成器）。当前方案默认沿用 `dsh-plugin-framework`。
- **生成插件的包名规范**：观察到的三个真实参考在命名上并不统一——`dsh-auth-gate`（连字符前缀）、`dshmarket`（无连字符）、`dsh-deeptutor`（连字符前缀）。为了让"由本框架搭建"这件事在包名上可辨识，建议新插件统一使用 `dsh-plugin-<kebab-name>` 前缀（例如本文档的示例插件 `dsh-plugin-hello-world`），同时兼容旧包沿用各自历史命名，不强制迁移存量插件改名。

### 1.2 FSD 概念 → dsh 插件概念映射表

| FSD 概念                                                 | dsh 插件对应物                                                                                                                                               | 说明                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `app`（应用启动、providers、router）                     | host：`src/index.ts` 的 `apply(ctx, config)` 装配根；client：`src/client/index.tsx` 的 `apply(ctx)` 装配根                                                   | 插件没有"应用启动"过程，只有 Cordis 生命周期装配入口；host/client 是两个物理隔离、独立编译的 Cordis 图，各自一个装配根 |
| `pages`（路由级页面）                                    | **无对应物**                                                                                                                                                 | 插件不拥有路由，UI 以 Slot 形式挂进宿主已有的页面（`settings.section`、`tool.view.*` 等）                              |
| `widgets`（跨页面复用的大 UI 块）                        | client 侧：同一插件被 2+ 个 Slot 复用的 UI 块（少见，多数插件只注册 1~2 个 Slot）                                                                            | 出现频率低，框架不强制预留目录                                                                                         |
| `features`（可复用用户交互流）                           | host：一条对外业务能力（一个 Gate 策略、一组 Tool 注册、一组 HTTP endpoint）；client：一个完整可交互的 UI 单元（如某个 `settings.section` 里的一个功能区块） | 判定标准与原 FSD 一致：被 2+ 处复用才提取，否则留在装配根                                                              |
| `entities`（业务领域模型 + 存储）                        | host：领域对象与持久化（session store、rate limiter、用户文件等）；client：极少需要，因为 client 不做持久化，数据来自 Slot props / `host.call`               |                                                                                                                        |
| `shared`（无业务逻辑的跨切片基础设施）                   | host：纯函数工具（cookie 解析、密码哈希、限流算法……）；client：UI 基础组件、CSS Modules 工具、locale 字典、类型契约                                          |                                                                                                                        |
| `shared/ui/<component>/`、`shared/lib/<lib>/` 子目录惯例 | 原样保留，镜像到 `client/shared/ui/<component>/`、`client/shared/lib/<lib>/`                                                                                 |                                                                                                                        |
| 路由 / 鉴权框架（TanStack Router / MSAL）                | **拒绝**                                                                                                                                                     | 宿主已提供应用壳与鉴权体系；插件如需门禁能力应实现 Gate/Guard 模式（见第 9 节），而不是引入独立路由或鉴权 SDK          |
| 设计令牌管线（tokens.json → SCSS/TS）                    | **拒绝**                                                                                                                                                     | 主题变量由宿主 theme service 以 CSS 变量下发（如 `dshmarket` 用的 `var(--dsw-alias-*)`），插件只消费不生成             |

### 1.3 拒绝清单（明确不移植，附理由）

| 被拒绝的技术/机制                               | 理由                                                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TanStack Router + `scripts/generate-routes.mjs` | 插件无路由概念，UI 通过 Slot 挂载，不存在"页面导航"                                                                                                       |
| MSAL / 独立鉴权框架                             | 鉴权数据与流程属于宿主职责；插件若要做门禁，应像 `dsh-auth-gate` 一样实现 `Gate`/`guard` 模式包一层宿主的 `webServer`，而不是引入客户端鉴权 SDK           |
| Zustand                                         | client bundle 是体积敏感的单文件产物；观察到的真实插件（`dshmarket`）用 `useState`/`useSyncExternalStore` 已经足够表达局部状态，不需要独立状态管理库      |
| TanStack Query                                  | 插件的数据来源主要是宿主 Service 或 Slot props，规模远小于"一整个 Web 应用的服务端状态缓存"场景；确需网络请求时用简单 `fetch`/`host.call` 封装即可        |
| 设计令牌管线（`generate-tokens.mjs` 全套）      | 客户端样式必须内联进单文件 bundle（CSS Modules 编译成 JS 对象 + 运行时注入 `<style>`），且主题色由宿主 theme service 下发，插件不需要也不应该自建令牌体系 |
| Vite SPA 构建                                   | client 产物是 tsdown 打的单文件 CJS closure（`window.__ModuleLoader__.load(...)`），不是可独立部署的 SPA                                                  |
| `.env` 体系 / `shared/config/env.d.ts`          | 插件配置来自 Cordis `Config`（zod schema）+ `cordis.patch.yml` 的部署态覆盖，不是构建期环境变量注入                                                       |

**Steiger 的取舍**：Steiger 的价值规则（`fsd/public-api`、`fsd/no-segmentless-slices`、`fsd/insignificant-slice` 等）理论上可以分别指向 `src` 与 `src/client` 运行，但插件仓库规模远小于典型 Web 应用（`dsh-auth-gate` 全部源文件仅 25 个），`insignificant-slice` 规则很可能对框架默认给出的三层里的大多数 slice 报警（因为很多逻辑天然只用一次）。**结论：框架默认不引入 Steiger**，分层强制完全交给零额外运行时依赖的 `eslint-plugin-import-x` 的 `no-restricted-paths`（已经在 ESLint pipeline 里，见第 4 节）。Steiger 留作插件规模显著增长后的可选升级项，而非默认门禁——详见第 10 节风险分析。

### 1.4 与 fsd-react 的差异清单

**照搬（原样或轻微适配）**：

- `aliases.json` 单一事实源思想 + `scripts/check-aliases.mjs` 的校验模式（去掉 Vite 镜像，只保留 tsconfig 镜像）
- `eslint.config.js` 里 `FSD_LAYERS.flatMap(...)` 生成 `no-restricted-paths` zones 的算法（层数精简为三层，并新增 host/client 边界 zone）
- `.betterer.ts` 的复杂度阈值数值（`complexity ≤ 15`、`max-lines ≤ 250`、`max-lines-per-function ≤ 80`）
- commitlint + husky + lint-staged 全套（Conventional Commits 规则集、pre-commit/commit-msg/pre-push 三个 hook 的职责划分）
- `skills/` 目录 + `scripts/sync-skills.mjs` 镜像同步机制（插件本身就要随包发布 `skills/<name>/SKILL.md`，这与 dsh 生态原生契合）
- Vitest 覆盖率门禁思路（四项阈值统一红线，仅调整初始数值，见第 5 节）
- 单 job `verify` 式 CI workflow 结构

**改造**：

- 六层分层 → 精简为 **host 三层**（`features`/`entities`/`shared`）+ **client 镜像三层**（`client/features`/`client/entities`/`client/shared`），`app` 层退化为两个装配根文件而非独立目录
- Public API barrel 机制保留，但因为没有 Steiger 兜底 `fsd/public-api` 规则，需要额外的人工 review 纪律或后续按需补一条自定义 ESLint 规则
- FSD Explorer（`/slices` 页面 + `vite-plugin-fsd-slice-creator`）→ 改造成纯 Node CLI 脚本 `scripts/create-slice.mjs`（去掉 Vite dev server 中间件外壳，模板生成逻辑基本保留）
- `docs/slice-guide.md`/`docs/architecture.md`/`docs/decisions.md` 的结构保留，内容替换为插件场景的分层定义与拒绝清单

**丢弃**：

- TanStack Router 及 `generate-routes.mjs`
- Zustand、TanStack Query
- 设计令牌管线 `generate-tokens.mjs`、Stylelint（插件用 CSS Modules 内联，不需要令牌体系配合）
- `.env`/`env.d.ts` 体系
- FSD Explorer 的 Vite 中间件形式（保留思路，改造为 CLI，见上）

---

## 2. 框架仓库的目标目录结构

```text
dsh-plugin-framework/
├── AGENTS.md                          # 面向 AI agent 的开发规范总纲：dsh 插件铁律 + 本框架分层规则
├── README.md                          # 面向人类开发者的框架说明与快速开始
├── package.json                       # 模板 package.json：dsh.bundle/dsh.client 元数据占位、exports、scripts、peerDependencies
├── cordis.patch.yml                   # 插件挂载 patch 模板（随包发布，`insert: [{ id, name }]`）
├── deploy/
│   └── cordis.patch.yml               # 部署态配置覆盖模板（不随包发布，仅供参考/复制）
├── tsconfig.json                      # host 侧 tsconfig（Node 环境，exclude src/client）
├── tsconfig.build.json                # host 构建产出 lib/ 的 tsconfig（extends tsconfig.json，outDir lib）
├── tsconfig.client.json               # client 侧 tsconfig（DOM + JSX 环境，include src/client）
├── tsconfig.client.build.json         # 仅产出 client .d.ts 的 tsconfig（extends tsconfig.client.json，emitDeclarationOnly）
├── tsconfig.node.json                 # 脚本/配置文件 tsconfig（scripts/*.mjs、*.config.ts）
├── tsdown.config.ts                   # client 单文件 bundle 打包配置（banner/footer 拼 window.__ModuleLoader__.load）
├── vitest.config.ts                   # host + client 统一测试配置，含覆盖率门禁
├── eslint.config.js                   # FSD 分层规则（host 三层 + client 三层 + 跨边界 zone）+ 插件铁律相关规则
├── .betterer.ts                       # 复杂度门禁（复用 fsd-react 阈值）
├── commitlint.config.js               # Conventional Commits 规则
├── .lintstagedrc.js                   # pre-commit 自动格式化 + eslint fix + skills 同步
├── .husky/
│   ├── pre-commit                     # npx lint-staged --concurrent 1
│   ├── commit-msg                     # 剥离 AI trailer + commitlint --edit
│   └── pre-push                       # npm run type-check
├── aliases.json                       # 路径别名单一事实源（host 三层 + client 三层前缀）
├── scripts/
│   ├── check-aliases.mjs              # 校验 tsconfig.json / tsconfig.client.json 的 paths 与 aliases.json 一致
│   ├── create-slice.mjs               # CLI 脚手架：生成 host/client 切片骨架（改造自 vite-plugin-fsd-slice-creator）
│   ├── check-no-emdash.mjs            # 组织级风格规则：禁止 em-dash（可选，按团队规范决定是否启用）
│   ├── sync-skills.mjs                # skills/ → .claude/skills/（及可扩展的其他 agent 镜像目标）
│   ├── verify-bundle.mjs              # 校验 tsdown 产物：单文件、外部化依赖仅 react/react-jsx-runtime(/primitives)
│   └── install-to-profile.mjs         # 把构建产物安装进本地 web profile 做冒烟测试（参考 dsh-deeptutor 的 install-profile.mjs）
├── skills/
│   ├── dsh-plugin-development/SKILL.md    # 裁剪自官方 cordis-plugin-development SKILL + 本框架专属约定
│   └── dsh-plugin-hello-world/SKILL.md    # 示例插件对外技能文档模板（随包发布，供使用该插件的 Agent 阅读）
├── docs/
│   ├── architecture.md                # 框架分层规则说明（改写自 fsd-react 的 architecture.md）
│   ├── slice-guide.md                 # 如何新建 host/client 切片（改写自 slice-guide.md，替换脚手架命令）
│   ├── decisions.md                   # 框架级约定记录（保留结构，替换 Router/Zustand 等相关条目）
│   └── fsd-port-plan.md               # 本方案文档自身
├── .github/
│   └── workflows/
│       └── ci.yml                     # type-check + lint + test(coverage) + build + bundle 校验
└── src/
    ├── index.ts                       # host 装配根：name/inject/Config(zod)/apply(ctx, config)
    ├── cli.ts                         # （可选）独立可执行入口示例，不进入分层体系，直接依赖 features/entities/shared
    ├── features/
    │   └── hello-settings/            # 示例 feature：注册模型 Tool + 暴露 harness.handle 给 client 读写
    │       ├── index.ts               # public API barrel
    │       ├── api/register-tool.ts   # 用 dsh-tools 的 defineTool 注册工具
    │       ├── api/register-tool.test.ts
    │       └── api/bridge.ts          # harness.handle("hello.getGreeting"/"hello.setGreeting") 注册
    ├── entities/
    │   └── greeting/                  # 示例 entity：领域对象（问候语状态）
    │       ├── index.ts
    │       ├── model/greeting.ts
    │       └── model/greeting.test.ts
    ├── shared/
    │   ├── config/
    │   │   ├── index.ts
    │   │   └── plugin-config.ts       # zod Config schema
    │   └── lib/
    │       └── logger/
    │           ├── index.ts
    │           └── logger.ts
    └── client/                        # client 镜像：独立 tsconfig、独立打包入口，与 host 物理隔离
        ├── index.tsx                  # client 装配根：name/inject/apply(ctx)，向 settings.section 注册 UI
        ├── features/
        │   └── hello-settings/
        │       ├── index.ts
        │       ├── ui/HelloSettingsSection.tsx
        │       ├── ui/HelloSettingsSection.module.css
        │       └── ui/HelloSettingsSection.test.tsx
        └── shared/
            ├── config/
            │   └── context.ts         # 结构类型镜像：AuthContext 风格的 ClientContext 接口，不 import 任何 @deepseek-ai/* 运行时值
            └── ui/
                └── button/
                    ├── index.ts
                    ├── Button.tsx
                    └── Button.module.css
```

**目录设计要点**：

- `src/entities/` 与 `src/client/` 下不预置 `client/entities/`——按 FSD v2.1 "不是所有层都需要"的原则，client 侧目前没有持久化领域对象的需求，框架不强行创建空目录；真正需要时再由 `create-slice.mjs` 生成。
- `app` 层没有独立目录，只有 `src/index.ts` 与 `src/client/index.tsx` 两个装配根文件，它们可以导入下方任意层（等价于 FSD 里 `app` 层的地位），但不能被其他任何文件反向导入。

---

## 3. 内置示例插件设计

框架自带一个最小但完整的示例插件 `dsh-plugin-hello-world`，同时验证：host 侧 Tool 注册、host↔client 的 `harness.handle`/`host.call` 通信、client 侧 `settings.section` Slot 注册、tsdown 单文件产物。

### 3.1 host 侧：`src/index.ts`

```ts
import type { Context } from "@deepseek-ai/cordis";
import { z } from "zod";
import { registerHelloTool } from "./features/hello-settings/api/register-tool.js";
import { registerHelloBridge } from "./features/hello-settings/api/bridge.js";
import { GreetingService } from "./entities/greeting/model/greeting.js";
import { logger } from "./shared/lib/logger/index.js";

export const name = "dsh-plugin-hello-world";
export const inject = ["tools"] as const;

export const Config = z.object({
  defaultGreeting: z.string().default("Hello from dsh-plugin-framework"),
});
export type Config = z.infer<typeof Config>;

export function apply(ctx: Context, config: Config) {
  const greeting = new GreetingService(config.defaultGreeting);

  ctx.effect(() => registerHelloTool(ctx, greeting), "hello-settings: register tool");
  ctx.effect(() => registerHelloBridge(ctx, greeting), "hello-settings: expose greeting to client");

  logger.info("dsh-plugin-hello-world activated");
}
```

### 3.2 host 侧：Tool 注册（`features/hello-settings/api/register-tool.ts`）

```ts
import type { Context } from "@deepseek-ai/cordis";
import { defineTool } from "@deepseek-ai/dsh-tools";
import type { GreetingService } from "../../../entities/greeting/model/greeting.js";

export function registerHelloTool(ctx: Context, greeting: GreetingService) {
  return ctx.tools.register(
    defineTool({
      name: "hello_world_greet",
      description: "Return the plugin's current greeting message.",
      parameters: { type: "object", properties: {}, required: [] },
      async execute() {
        return { text: greeting.getGreeting() };
      },
    }),
  );
}
```

### 3.3 host 侧：Host↔Client 桥接（`features/hello-settings/api/bridge.ts`）

```ts
import type { Context } from "@deepseek-ai/cordis";
import type { GreetingService } from "../../../entities/greeting/model/greeting.js";

export function registerHelloBridge(ctx: Context, greeting: GreetingService) {
  const harness = ctx.get("harness");
  if (harness === undefined) return () => {};

  const disposers = [
    harness.handle("hello.getGreeting", async () => greeting.getGreeting()),
    harness.handle("hello.setGreeting", async (text: string) => {
      greeting.setGreeting(text);
      return greeting.getGreeting();
    }),
  ];
  return () => disposers.forEach((dispose) => dispose());
}
```

### 3.4 entity：`entities/greeting/model/greeting.ts`

```ts
export class GreetingService {
  #greeting: string;

  constructor(initial: string) {
    this.#greeting = initial;
  }

  getGreeting(): string {
    return this.#greeting;
  }

  setGreeting(next: string): void {
    this.#greeting = next;
  }
}
```

### 3.5 client 侧：类型契约（`client/shared/config/context.ts`）

仿照 `dsh-auth-gate/src/client/context.ts` 的做法——只写结构类型，不 import 任何 `@deepseek-ai/*` 运行时值，从根上规避 client bundle "禁止跨插件值导入"的限制（详见第 9 节的架构观察）：

```ts
export interface SlotRegisterOptions {
  name: string;
  id: string;
  order?: number;
  label: () => string;
}

export interface SlotsService {
  inject(slotName: string, register: () => void): void;
  register(options: SlotRegisterOptions, view: () => unknown): void;
}

export interface HostBridge {
  call<T>(method: string, ...args: unknown[]): Promise<T>;
}

export interface HelloClientContext {
  slots: SlotsService;
  host: HostBridge;
}
```

### 3.6 client 侧：装配根（`src/client/index.tsx`）

```tsx
import type { HelloClientContext } from "./shared/config/context.js";
import { HelloSettingsSection } from "./features/hello-settings/ui/HelloSettingsSection.js";

export const name = "dsh-plugin-hello-world";
export const inject = ["slots"] as const;

export function apply(ctx: HelloClientContext): void {
  ctx.slots.inject("settings.section", () =>
    ctx.slots.register(
      {
        name: "settings.section",
        id: "hello-world",
        order: 100,
        label: () => "Hello World",
      },
      () => <HelloSettingsSection host={ctx.host} />,
    ),
  );
}
```

### 3.7 client 侧：Slot UI（`client/features/hello-settings/ui/HelloSettingsSection.tsx`）

```tsx
import { useCallback, useEffect, useState } from "react";
import type { HostBridge } from "../../../shared/config/context.js";
import css from "./HelloSettingsSection.module.css";

interface Props {
  host: HostBridge;
}

export function HelloSettingsSection({ host }: Props) {
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    host.call<string>("hello.getGreeting").then(setGreeting);
  }, [host]);

  const handleSave = useCallback(() => {
    host.call<string>("hello.setGreeting", greeting).then(setGreeting);
  }, [host, greeting]);

  return (
    <div className={css.root}>
      <input
        className={css.input}
        data-testid="hello-settings-greeting-input"
        value={greeting}
        onChange={(e) => setGreeting(e.target.value)}
      />
      <button data-testid="hello-settings-save-btn" onClick={handleSave}>
        Save
      </button>
    </div>
  );
}
```

### 3.8 打包配置：`tsdown.config.ts`

逐字对应 `dsh-auth-gate/tsdown.config.ts` 的形态，只替换 `id`：

```ts
import type { UserConfig } from "tsdown";

const CLIENT_EXTERNALS = ["react", "react/jsx-runtime"];

export default [
  {
    entry: { client: "src/client/index.tsx" },
    outDir: "lib",
    format: "cjs",
    platform: "browser",
    dts: false,
    sourcemap: true,
    clean: false,
    external: CLIENT_EXTERNALS,
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env["NODE_ENV"] ?? "production"),
    },
    noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
    outputOptions: {
      entryFileNames: "client.js",
      banner: `window.__ModuleLoader__.load({ id: "dsh-plugin-hello-world", factory: (require) => {`,
      footer: "return module.exports; } });",
      intro: "var module = { exports: {} }; var exports = module.exports;",
      codeSplitting: false,
    },
  },
] satisfies UserConfig[];
```

### 3.9 挂载配置：`cordis.patch.yml`

```yaml
- insert:
    - id: dsh-plugin-hello-world
      name: "dsh-plugin-hello-world"
```

### 3.10 package.json 关键字段

```json
{
  "name": "dsh-plugin-hello-world",
  "main": "./lib/index.js",
  "types": "./lib/index.d.ts",
  "exports": {
    ".": { "types": "./lib/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/client/index.d.ts", "default": "./lib/client.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib", "cordis.patch.yml", "skills"],
  "scripts": {
    "build": "tsc -p tsconfig.build.json && tsdown && tsc -p tsconfig.client.build.json",
    "type-check": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.client.json --noEmit"
  },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "inject": ["@deepseek-ai/dsh-client-runtime", "@deepseek-ai/dsh-client-ui-slots"],
      "platform": "web"
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/dsh-tools": "^0.1.0-rc.6"
  },
  "devDependencies": {
    "react": "^18.3.1",
    "tsdown": "^0.22.14"
  }
}
```

这一套组合验证了：host 侧 `tsc` 双产物（运行时 + 声明）、client 侧 `tsc --emitDeclarationOnly` 与 `tsdown` 两条独立流水线、`exports["./client"]` 精确指向单文件、`dsh.bundle`/`dsh.client` 两段独立元数据——与 `dsh-auth-gate` 的真实工程形态完全对齐。

---

## 4. 分层依赖规则

### 4.1 依赖矩阵

**Host 侧**：

| 层                             | 可以 import                            | 不能 import                                          |
| ------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| `src/index.ts`（装配根）       | `features/*`、`entities/*`、`shared/*` | 无限制（等价 FSD 的 `app` 层）                       |
| `src/cli.ts`（独立入口，如有） | `features/*`、`entities/*`、`shared/*` | 同上                                                 |
| `features/<slice>`             | `entities/*`、`shared/*`               | 其他 `features/*`（同层禁止互引）                    |
| `entities/<slice>`             | `shared/*`                             | 其他 `entities/*`（同层禁止互引）、任何 `features/*` |
| `shared/*`                     | `shared/*` 内部 segment 互相 import    | `features/*`、`entities/*`                           |

**Client 侧**（镜像同一套规则，作用域限定在 `src/client/` 内部）：

| 层                               | 可以 import                                                 | 不能 import                                        |
| -------------------------------- | ----------------------------------------------------------- | -------------------------------------------------- |
| `src/client/index.tsx`（装配根） | `client/features/*`、`client/entities/*`、`client/shared/*` | host 侧 `src/**`（物理隔离）                       |
| `client/features/<slice>`        | `client/entities/*`、`client/shared/*`                      | 其他 `client/features/*`                           |
| `client/entities/<slice>`        | `client/shared/*`                                           | 其他 `client/entities/*`、任何 `client/features/*` |
| `client/shared/*`                | `client/shared/*` 内部互相 import                           | `client/features/*`、`client/entities/*`           |

**跨边界规则**：host 与 client 之间**没有任何合法的代码 import**，只能通过：

1. 类型契约文件（如 `client/shared/config/context.ts`）做结构类型镜像，不 import 运行时值；
2. `harness.handle`/`host.call` 的 JSON-RPC 通信；
3. 插件自建 HTTP 路由 + client 侧 `fetch`（`dshmarket` 采用的模式）。

这与 `dsh-auth-gate` 的真实实践完全一致：其 `src/client/context.ts` 明确不 import 任何 `@deepseek-ai/*` 运行时值。

### 4.2 同层依赖冲突的处理策略（重要）

当两个"看起来应该是同层"的模块存在真实依赖（例如一个 HTTP 守卫模块只依赖另一个门禁接口模块的**类型**），优先用 **FSD Strategy A（slice 合并）**：把两者合并进同一个 slice 的不同文件里，而不是拆成两个 slice 再用 `@x` 记法桥接。`@x` 是"边界确实无法合并时的妥协"，不是默认选项。第 9 节的映射演练给出了具体案例（`gate.ts` + `guard.ts` + `self-check.ts` 合并进同一个 `entities/gate/` slice）。

### 4.3 `eslint.config.js` 落地配置（可直接粘贴）

```js
const HOST_LAYERS = ["features", "entities", "shared"];
const CLIENT_LAYERS = ["features", "entities", "shared"];

function buildZones(layers, prefix) {
  return layers.flatMap((layer, idx) => {
    const upper = layers.slice(0, idx);
    return upper.map((u) => ({
      target: `./${prefix}/${layer}`,
      from: `./${prefix}/${u}`,
      message: `FSD: layer "${layer}" may not import from upper layer "${u}"`,
    }));
  });
}

const hostZones = buildZones(HOST_LAYERS, "src");
const clientZones = buildZones(CLIENT_LAYERS, "src/client");

// host 与 client 之间禁止任何直接代码 import（只允许通过契约类型 / RPC / HTTP 耦合）
const crossBoundaryZones = [
  {
    target: "./src",
    from: "./src/client",
    message: "Host 不得 import client 侧代码：两者是独立编译、独立打包的运行时。",
  },
  {
    target: "./src/client",
    from: "./src",
    except: ["./client"],
    message: "Client 不得 import host 侧运行时代码，只允许通过类型契约文件镜像结构。",
  },
];

export default [
  // ... 其余 extends 与 fsd-react 一致（tseslint recommendedTypeChecked、importX 等）
  {
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        { zones: [...hostZones, ...clientZones, ...crossBoundaryZones] },
      ],
    },
  },
  {
    // 铁律 1：host 侧禁止 JSX / React —— UI 只能在 src/client 侧表达
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/client/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXElement, JSXFragment",
          message: "Host 侧插件代码禁止使用 JSX/React，UI 只能通过 Slot 在 src/client 侧渲染。",
        },
      ],
    },
  },
  {
    // 铁律 2：client 侧禁止直接操作 window/document —— 副作用需经 ctx.effect 声明并可回收
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "document",
          message: "Client 插件不得直接操作 document，UI 只能通过 Slot 渲染表达。",
        },
        {
          name: "window",
          message: "Client 插件不得直接操作 window，跨插件通信请走 host.call/Slot props。",
        },
      ],
    },
  },
];
```

第一条铁律规则直接来自本次调研中反复确认的约束（"host 侧不得用 JSX"）；第二条来自"client 侧不得直接操作 window/document/body"的硬约束。两者都是本框架相对 fsd-react **新增**的规则段，fsd-react 因为是纯前端应用不需要这两条。

---

## 5. 路径别名与工程门禁

### 5.1 `aliases.json`（精简适配版）

```json
{
  "features": "src/features",
  "entities": "src/entities",
  "shared": "src/shared",
  "client/features": "src/client/features",
  "client/entities": "src/client/entities",
  "client/shared": "src/client/shared"
}
```

相比 fsd-react 的六层别名，精简为三层 + client 前缀镜像；**不需要 Vite 镜像**（插件不用 Vite 构建），只需要同步两份 tsconfig：

- `tsconfig.json`（host）的 `compilerOptions.paths` 消费不带 `client/` 前缀的三个 key，映射到 `./src/<layer>`；
- `tsconfig.client.json`（client）的 `compilerOptions.paths` 消费带 `client/` 前缀的三个 key，映射到 `./src/client/<layer>`（去掉前缀）。

`scripts/check-aliases.mjs` 在 fsd-react 版本基础上的改造点：原脚本只校验单一 `tsconfig.app.json`；框架版需要按 key 前缀分流后**分别校验两份 tsconfig**，其余的 JSONC 解析、`missing`/`extra`/`mismatched` 三类差异报告逻辑原样保留。

### 5.2 工程门禁优先级清单

| 门禁                                 | 在插件仓库里的形态                                                                                                                                                                        | 优先级                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| TypeScript 严格类型检查              | 双 tsconfig（`tsc -p tsconfig.json --noEmit` + `tsc -p tsconfig.client.json --noEmit`），沿用 fsd-react 的严格集（`strict`、`noUncheckedIndexedAccess`、`exactOptionalPropertyTypes` 等） | **现在做**（阶段 1）                                   |
| ESLint 分层规则                      | 第 4.3 节配置，零额外依赖（`eslint-plugin-import-x` 已在 pipeline 中）                                                                                                                    | **现在做**（阶段 2）                                   |
| Vitest + 覆盖率阈值                  | 单一 `vitest.config.ts` 同时跑 host（`.test.ts`）与 client（`.test.tsx`），初始阈值建议从 **70%** 起步（插件初期代码量小，几行未覆盖代码就会大幅波动 80% 红线），随插件成熟度上调到 80%   | **现在做**（阶段 2），阈值上调放到**以后做**           |
| `aliases:check`                      | 同 5.1，脚本改造                                                                                                                                                                          | **现在做**（阶段 2）                                   |
| commitlint + husky + lint-staged     | 原样复用 fsd-react 三段 hook 职责划分                                                                                                                                                     | **现在做**（阶段 4，但成本极低，也可提前到阶段 1）     |
| Betterer 复杂度门禁                  | 阈值原样复用（`complexity 15`/`max-lines 250`/`max-lines-per-function 80`），`exclude` 规则改为排除 `*.test.{ts,tsx}` 与自动生成文件                                                      | **框架建成时**（阶段 4）                               |
| CI workflow 完整化                   | `type-check` → `lint` → `test --coverage` → `build` → `verify-bundle.mjs`                                                                                                                 | **框架建成时**（阶段 4）                               |
| `verify-bundle.mjs`（新增）          | 校验 tsdown 产物：单文件、`external` 仅含 `react`/`react/jsx-runtime`（/`@deepseek-ai/dsh-client-ui-primitives`）、bundle 顶层确有且仅有一次 `window.__ModuleLoader__.load(...)` 调用     | **框架建成时**（阶段 4）                               |
| `skills:sync`/`skills:check`         | 原样复用，`TARGETS` map 从一开始就设计成可扩展（`{ claude: ".claude/skills", opencode: ".opencode/skills" }`），规避 fsd-react 当前 `.opencode/skills/` 手工维护漂移的问题                | **框架建成时**（阶段 5）                               |
| `format:check`（Prettier）           | 原样复用                                                                                                                                                                                  | **框架建成时**（阶段 4）                               |
| Steiger                              | 见 1.3 节分析，插件规模小时噪音大于价值                                                                                                                                                   | **以后做**（插件规模显著增长、slice 数量变多后再引入） |
| `lock:check`（pnpm lockfile 一致性） | 发布多个插件、共享 CI 模板时才有意义                                                                                                                                                      | **以后做**                                             |
| `check-no-emdash.mjs`                | 按组织规范决定（本组织已有相关指令，建议启用）                                                                                                                                            | **现在做**，成本极低                                   |

---

## 6. 从 fsd-react 提取的可复用资产清单

| 源文件（fsd-react）                                                  | 复用方式                                                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/check-aliases.mjs`                                          | JSONC 解析器、`missing`/`extra`/`mismatched` 三类差异检测逻辑原样复用；改造点：从校验单一 `tsconfig.app.json` 改为按 `aliases.json` key 的 `client/` 前缀分流，分别校验 `tsconfig.json` 与 `tsconfig.client.json`（见 5.1）                                                                                                                                                               |
| `eslint.config.js` 的 `FSD_LAYERS.flatMap(...)` 生成算法             | 算法原样复用；层名从六层精简为 host 三层 + client 三层；新增 `crossBoundaryZones` 与两条插件专属铁律规则（4.3 节）                                                                                                                                                                                                                                                                        |
| `.betterer.ts`                                                       | 三项阈值数值原样复用（该阈值本身也是从姊妹项目 ADR 沿用的通用基线，不是 fsd-react 原创）；`exclude` 规则替换为插件仓库的测试文件模式                                                                                                                                                                                                                                                      |
| `docs/slice-guide.md`                                                | 结构保留（分层定义 → 决策树 → 手动配方 → 经验法则），改写要点：删除 pages/widgets 相关内容，脚手架命令从 "FSD Explorer `/slices` 页面" 替换为 `node scripts/create-slice.mjs`，补充 host/client 镜像切片的建法说明                                                                                                                                                                        |
| `docs/architecture.md`、`docs/decisions.md`                          | 结构保留，内容替换：路由/状态管理/设计令牌章节整体删除，替换为 host/client 隔离规则、Slot 通信约定、Cordis 生命周期纪律                                                                                                                                                                                                                                                                   |
| `plugins/vite-plugin-fsd-slice-creator.ts` + FSD Explorer(`/slices`) | **改造为 CLI**：去掉 `configureServer` 中间件外壳与 `apply: "serve"` 限定，改成 `process.argv` 解析 + Node `fs` 直接写盘；`SEGMENT_TEMPLATES` 模板函数（`uiTemplate`/`modelTemplate`/`apiTemplate`）基本保留，import 路径从 `"shared/api"` 改为框架别名；新增 `--side host\|client` 参数控制生成目标目录与 segment 集合（client 侧没有独立 `api`/`config` segment，数据来自 `host.call`） |
| `commitlint.config.js`、`.lintstagedrc.js`、`.husky/*`               | 原样复用，包括 `skills/**/*` 用函数形式规避 Windows 竞态的写法、`commit-msg` 里剥离 `Co-authored-by: Copilot` trailer 的 `sed` 脚本                                                                                                                                                                                                                                                       |
| `scripts/sync-skills.mjs`                                            | 原样复用整套哈希比较 + "先写后清理" 的 drift 检测逻辑；`TARGETS` map 从一开始就写成多目标形式                                                                                                                                                                                                                                                                                             |
| `scripts/check-no-emdash.mjs`                                        | 原样复用（可选启用）                                                                                                                                                                                                                                                                                                                                                                      |
| `scripts/generate-tokens.mjs`                                        | **不复用核心管道**（插件不需要设计令牌），但其 "AUTO-GENERATED 头部警告 + 手工维护补充常量分离" 的写法思路，可用于框架未来若要新增其他生成脚本（如从 `cordis.patch.yml` 生成类型声明）时参考                                                                                                                                                                                              |
| `scripts/generate-routes.mjs`                                        | 不复用（无路由）                                                                                                                                                                                                                                                                                                                                                                          |
| `.github/workflows/ci.yml`                                           | 结构复用（单 job、`actions/setup-node@v4` + npm 缓存、仅 PR 事件跑 commitlint），步骤内容替换为 5.2 节门禁清单；同时修正 fsd-react 自身 "verify 脚本与 CI workflow 步骤不完全对齐" 的落差（框架版本应让 CI 显式覆盖 `npm run verify` 里的每一步，不依赖 `build` 隐式覆盖 `type-check`）                                                                                                   |

---

## 7. 分阶段搭建步骤

### 阶段 1：空仓库骨架 + 构建链绿

**完成标准**：`npm run type-check`（host + client 双 tsconfig）通过；`npm run build` 能产出 `lib/index.js` 与 `lib/client.js`；仓库里只有骨架文件，无业务逻辑。

**创建文件**：`package.json`、`tsconfig.json`、`tsconfig.build.json`、`tsconfig.client.json`、`tsconfig.client.build.json`、`tsconfig.node.json`、`tsdown.config.ts`、`cordis.patch.yml`、`.gitignore`、`README.md`（初稿）、`src/index.ts`（最小 no-op apply）、`src/client/index.tsx`（最小 no-op apply）。

### 阶段 2：示例插件 host 侧跑通

**完成标准**：`hello_world_greet` Tool 能通过单测验证注册成功；`npm run test`（host 部分）全绿；ESLint 分层规则生效且无违规。

**创建文件**：`src/entities/greeting/**`、`src/features/hello-settings/api/**`、`src/shared/config/plugin-config.ts`、`src/shared/lib/logger/**`、`eslint.config.js`（host 分层规则段）、`vitest.config.ts`、`aliases.json`、`scripts/check-aliases.mjs`。

### 阶段 3：client 侧单文件 bundle 产出并安装进 web profile 冒烟

**完成标准**：`npm run build` 产出的 `lib/client.js` 经 `scripts/verify-bundle.mjs` 校验通过（单文件、外部化依赖仅 `react`/`react/jsx-runtime`）；`pnpm install` 进 `C:\Users\Randal_Wang\.dsh\profiles\web` 后能在设置页看到 "Hello World" 区块；输入文本点击 Save 后，`hello_world_greet` Tool 返回更新后的文本。

**创建文件**：`src/client/shared/config/context.ts`、`src/client/features/hello-settings/ui/**`、`src/client/shared/ui/button/**`、`scripts/verify-bundle.mjs`、`scripts/install-to-profile.mjs`。

### 阶段 4：门禁齐活

**完成标准**：`npm run verify`（聚合命令）一次跑通 lint + type-check + test + betterer:ci；`.github/workflows/ci.yml` 在 push/PR 时全绿；commitlint/husky 三个 hook 生效（可用一次故意写错格式的 commit message 验证 commit-msg hook 拦截）。

**创建文件**：`.betterer.ts`、`commitlint.config.js`、`.lintstagedrc.js`、`.husky/{pre-commit,commit-msg,pre-push}`、`.github/workflows/ci.yml`。

### 阶段 5：文档 + 模板打磨

**完成标准**：`docs/architecture.md`、`docs/slice-guide.md`、`docs/decisions.md` 齐全；`AGENTS.md` 足以让一个未参与本次讨论的新 agent 直接照着建切片而不用追问；`scripts/create-slice.mjs` 可用并有基本测试；`skills/dsh-plugin-development/SKILL.md` 完成。

**创建文件**：`docs/architecture.md`、`docs/slice-guide.md`、`docs/decisions.md`、`AGENTS.md`、`scripts/create-slice.mjs`、`scripts/sync-skills.mjs`、`skills/dsh-plugin-development/SKILL.md`。

---

## 8. 从框架起步开发新插件的标准流程

- [ ] 1. 复制本框架仓库到新目录（或 `npx degit <framework-repo> my-new-plugin`）
- [ ] 2. 全局替换插件名：`package.json` 的 `name`/`dsh.bundle`/`dsh.client`、`cordis.patch.yml` 的 `id` + `name`、`tsdown.config.ts` banner 里的 `id` 字符串、`src/index.ts` 与 `src/client/index.tsx` 的 `export const name`
- [ ] 3. 删除示例切片（`features/hello-settings`、`entities/greeting`、`client/features/hello-settings`），保留空的分层目录骨架
- [ ] 4. 编辑 `package.json` 的 `peerDependencies`/`dependencies`（按需增删 `@deepseek-ai/cordis` 版本、`@deepseek-ai/dsh-tools`、`@deepseek-ai/dsh-storage-domain` 等）
- [ ] 5. 用 `node scripts/create-slice.mjs --layer features --name <slice-name> --side host` 生成新切片骨架（host/client 两侧按需分别执行）
- [ ] 6. 实现业务逻辑，遵循第 4 节分层规则（features 不能互相 import，shared 不能有业务逻辑）
- [ ] 7. 补充/更新 `skills/<plugin-name>/SKILL.md`（面向使用该插件的 Agent 的操作手册）
- [ ] 8. 本地验证：`npm run verify`
- [ ] 9. 构建：`npm run build`（host `tsc` + client `tsdown`）
- [ ] 10. 本地冒烟：`node scripts/install-to-profile.mjs` 把构建产物安装进 `~/.dsh/profiles/web`，重启 dsh 验证设置页 UI 与 Tool 调用
- [ ] 11. 更新 `deploy/cordis.patch.yml` 模板，写清楚该插件的部署态 config schema
- [ ] 12. 提交（commitlint 约束的 Conventional Commits 格式）+ 发起 PR / 发布 npm 包

---

## 9. 验证用例：dsh-auth-gate 映射演练

若 `dsh-auth-gate` 建在本框架上，其现有 25 个源文件（不含测试）按以下规则重新落位。判定依据：**被 2 个及以上消费者复用 → 提取到 `entities`/`shared`；只被 1 处使用 → 保留在使用它的 `features` 里**（FSD v2.1 "start simple, extract when needed" 原则），零仓内依赖的纯函数默认归 `shared`。

### 9.1 关键架构决策：`gate.ts` + `guard.ts` + `self-check.ts` 合并为一个 entity slice

`guard.ts` 只依赖 `gate.ts` 的**类型**（`Gate`/`GuardKind`），`self-check.ts` 依赖 `guard.ts` 的值（`isGuarded`/`WrappableServer`）。三者概念上同属"HTTP 守卫基础设施"，若拆成三个独立 entity slice 会违反"同层禁止互相 import"的规则。按 FSD Strategy A（slice 合并），三者合并进同一个 `entities/gate/` slice 的不同文件——slice 内文件互相 import 不受跨层规则约束。

### 9.2 完整映射表

| 现文件（`dsh-auth-gate/src/`） | 框架内路径                                           | 判定理由                                                                                                                              |
| ------------------------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `index.ts`                     | `src/index.ts`                                       | 装配根，不进入 slice 体系                                                                                                             |
| `cli.ts`                       | `src/cli.ts`                                         | 独立可执行入口（`bin: dsh-auth`），依赖 `shared/lib/password` 与 `entities/users`，与 `index.ts` 同级                                 |
| `gate.ts`                      | `entities/gate/model/gate.ts`                        | 零依赖的领域接口，被 `index.ts`、两个 auth feature 共同消费                                                                           |
| `guard.ts`                     | `entities/gate/model/guard.ts`                       | 与 `gate.ts` 同 slice（见 9.1），被两个 auth feature 消费                                                                             |
| `self-check.ts`                | `entities/gate/model/self-check.ts`                  | 与 `guard.ts` 同 slice，仅被 `index.ts` 消费                                                                                          |
| `session-store.ts`             | `entities/session/model/session-store.ts`            | 独立持久化叶子，被 `index.ts` + 两个 auth feature 共同消费，天然 entity                                                               |
| `users-file.ts`                | `entities/users/model/users-file.ts`                 | 被 `password-login.ts`（feature）与 `cli.ts`（独立入口）两处消费，跨越 feature 边界，提升为 entity                                    |
| `cookie.ts`                    | `shared/lib/cookie/cookie.ts`                        | 零依赖纯函数，被两个 auth feature 消费，无业务逻辑                                                                                    |
| `form-body.ts`                 | `shared/lib/form-body/form-body.ts`                  | 零依赖纯函数，被两个 auth feature 消费                                                                                                |
| `auth-common.ts`               | `shared/lib/auth-common/auth-common.ts`              | 零依赖纯函数（`validateNext` 防开放重定向），被两个 auth feature 消费，无领域状态                                                     |
| `password.ts`                  | `shared/lib/password/password.ts`                    | 零依赖密码学工具，被 `password-auth` feature 与 `cli.ts` 消费；即便只被一处 feature 用，加密算法本质是基础设施而非业务逻辑，归 shared |
| `login-page.ts`                | `shared/ui/login-page/login-page.ts`                 | 纯 HTML 字符串模板渲染（host 侧禁止 JSX，改用模板函数），被两个 auth feature 消费，无业务规则                                         |
| `rate-limit.ts`                | `features/password-auth/model/rate-limit.ts`         | **保留局部，不提取**——当前只被 `password-login.ts` 一处消费，按"start simple"原则不应提前提升为 entity                                |
| `token-gate.ts`                | `features/token-auth/model/token-gate.ts`            | Token 模式 Gate 实现，是一条完整的对外业务能力                                                                                        |
| `auth-endpoints.ts`            | `features/token-auth/api/auth-endpoints.ts`          | Token 模式的 HTTP 端点注册                                                                                                            |
| `password-gate.ts`             | `features/password-auth/model/password-gate.ts`      | Password 模式 Gate 实现                                                                                                               |
| `password-login.ts`            | `features/password-auth/model/password-login.ts`     | Password 模式登录处理逻辑，只被 `password-endpoints.ts` 消费                                                                          |
| `password-endpoints.ts`        | `features/password-auth/api/password-endpoints.ts`   | Password 模式的 HTTP 端点注册                                                                                                         |
| `client/index.tsx`             | `src/client/index.tsx`                               | client 装配根，不进入 slice 体系                                                                                                      |
| `client/context.ts`            | `client/shared/config/context.ts`                    | 全局类型契约，供 client 侧所有 feature 共享                                                                                           |
| `client/logout-action.tsx`     | `client/features/session-logout/ui/LogoutAction.tsx` | 一个完整的用户交互（登出按钮），提取为 client feature                                                                                 |

**测试文件**：与被测文件同目录共存（沿用 fsd-react "就近测试" 惯例）。跨切片的场景化测试（`integration.auth.test.ts`、`integration.guard.test.ts`、`integration.password.*.test.ts`、`integration.session.test.ts`）验证的是**装配后的整体行为**而非单个 slice，建议保留在装配根旁：`src/index.integration.*.test.ts`。

### 9.3 结果观察

- Host 侧从"25 个文件平铺在 `src/` 根目录"变为 3 个 entity slice（`gate`/`session`/`users`）+ 2 个 feature slice（`token-auth`/`password-auth`）+ 5 个 shared 模块 + 2 个独立入口（`index.ts`/`cli.ts`），依赖方向清晰可查，且没有出现"为了合规而过度拆分"的情况（`rate-limit.ts` 刻意保留在 feature 内）。
- Client 侧 4 个文件中，3 个有明确落位，`client/entities/` 目录保持为空——验证了"不是所有层都需要"的框架设计不会强迫开发者填充不需要的层级。
- 唯一需要"架构判断"而非机械映射的地方就是 9.1 节的 slice 合并决策，这也是本框架相比"六层照搬"更贴合插件规模的证据：小规模代码库里，过度追求"一个概念一个 slice"反而会制造出不必要的跨层耦合问题。

---

## 10. 风险与权衡

### 10.1 单文件 client bundle 与多文件分层的张力

`tsdown` 的 `codeSplitting: false` 意味着无论 client 侧分了多少层/切片，最终都会被拍平进一个文件；CSS Modules 也要内联进 JS（编译成类名映射对象 + 运行时注入 `<style>`）。分层的价值只停留在**源码组织与可维护性**，构建产物层面没有传统 Web 应用"按路由代码分割"那样的实际收益。**应对**：client 侧的分层粒度应该比 host 侧更保守——只有当一个 UI 区块逻辑确实复杂到值得独立测试/独立文件时才拆分 feature，不必强行对齐 host 侧的切分密度。

### 10.2 FSD 过度设计风险

插件体量普遍远小于典型 Web 应用（`dsh-auth-gate` 全部源码仅 25 个文件），完整照搬六层会制造大量"单文件 slice"和常年为空的 `widgets`/`pages` 目录。**应对**：框架铁律只保留三层（`features`/`entities`/`shared`），`app` 层退化为两个装配根文件而非目录；`docs/slice-guide.md` 与 `create-slice.mjs` 反复强调"新逻辑默认先写在装配根或已有 feature 里，只有真正被 2+ 处复用才拆分 entity/shared"，把 FSD v2.1 "pages-first" 的精神对应到插件场景的"装配根优先"。

### 10.3 与官方动态插件（`cordis_define`/`cordis_run`）的关系

动态插件是运行时下发的临时脚本，受官方 SKILL 约束（必须用 `React.createElement` 而非 JSX、无构建步骤、代码即部署），规模天然是几十到几百行。本框架完全管不到、也不需要管这类插件——它们没有 `tsc`/`tsdown`/npm 包分发的概念。两者是互补关系：动态插件解决"快速试验、一次性小工具"，本框架解决"需要多文件组织、类型检查、测试、版本管理的长期维护型插件"。框架文档应明确写清这条边界，避免使用者误以为框架也适用于动态插件场景。

### 10.4 框架自身的维护成本

门禁越多（betterer、commitlint、husky、CI），每个由框架生成的插件仓库都要在自己的生命周期内维护这些门禁（依赖升级、阈值调整、CI 时长）。插件仓库往往是小型、间歇性维护的项目，门禁的边际成本占比高于长期滚动开发的 Web 应用。**应对**：严格区分"框架仓库自己的门禁"（可以齐全，因为框架本身会被长期维护和反复复制）与"新插件默认继承的门禁"——建议 Betterer 默认不随新插件生成（避免每个插件都背一份很快过时的 `.betterer.results` 基线文件），由使用者在插件确实需要复杂度门禁时按需从框架仓库"抄"配置回来。

### 10.5 别名机制的取舍

去掉 Vite 镜像后，`aliases.json` 只需同步两份 tsconfig，机制已经很轻；但插件文件数量少时，路径别名本身的收益也值得商榷——小仓库里 `../../shared/lib/x` 这样的相对路径并不算太痛苦。**应对**：框架默认提供别名机制（面向"插件未来会变大"的场景），但如果具体插件规模很小（个位数文件），允许开发者在阶段 1 就直接删除 `aliases.json` 与相关 tsconfig `paths`，退化为相对路径导入——不作为强制门槛，体现"框架提供轻量路径"的设计意图。
