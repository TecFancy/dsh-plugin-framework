---
name: dsh-plugin-development
description: Develop, modify, debug, or verify static dsh (DeepSeek Harness) Cordis plugins built on the dsh-plugin-framework scaffold: FSD three-layer host slices, mirrored single-file client bundles, slot registration, host/client RPC, lifecycle and gating rules. Use this skill before adding features, slices, tools, or client UI to a framework-based plugin.
---

# Develop dsh plugins on the dsh-plugin-framework scaffold

This skill covers STATIC npm-package plugins built on this framework. Dynamic
plugins (created at runtime via cordis_define/cordis_run) are plain sandboxed
JavaScript with no build step and are OUT OF SCOPE: they have no tsc/tsdown/npm
concepts, and framework rules do not apply to them.

## The two halves

- HOST half: Node ESM compiled by tsc (`src/`, excluding `src/client`). A
  plain Cordis plugin: `name`, `inject`, `Config` (schemastery), `apply(ctx,
config)`. No JSX, ever.
- CLIENT half: `src/client/`, type-checked with its own tsconfig and bundled
  by tsdown into ONE file `lib/client.js` in the
  `window.__ModuleLoader__.load({ id, factory })` CJS closure format. Only
  externals are `react` / `react/jsx-runtime`. No `@deepseek-ai/*` runtime
  imports on the client (types are structural mirrors).

## Layer rules (enforced by ESLint no-restricted-paths)

Host: features > entities > shared. Client mirror: client/features >
client/entities > client/shared. A layer imports only strictly lower layers;
same-layer slices never import each other (merge slices instead). Host and
client never import each other: coupling is limited to type contracts
(`src/client/shared/config/context.ts`) and RPC (`harness.handle` on host,
`host.call` on client). Bars and barrels: every slice exposes index.ts as its
only import surface; imports are relative (host with the `.js` suffix, client
with the `.ts`/`.tsx` suffix); the `client/...` aliases are also wired up if a
plugin prefers them.

## Iron laws

1. Host code never uses JSX/React.
2. Client code never touches window/document directly; styles go through CSS
   Modules (inlined) and colors come from host theme variables.
3. Every contribution is disposable: use ctx.effect with a disposer-returning
   callback; retain and return disposers from registration APIs. Nothing at
   module scope.
4. RPC payloads are lossless JSON only; never pass functions, elements,
   classes, or services.

## Runner-injected builtins

- Host: `harness` (.handle, .registerTool, ...) - ambient declaration in
  src/global.d.ts; guard access with `typeof harness === "undefined"`.
- Client: `host` (.call), `React`, `styles` - ambient declaration in
  src/client/global.d.ts.

## Slots

Query the live slot tree before choosing a target (Slots.listSubTree on the
client, or the official cordis-plugin-development skill). Prefer additive
inner slots (settings.section, sidebar.footer.action, tool.view.*) over
structural ones; replacing an occupant removes its descendants.

## Gating

`npm run verify` runs format:check, lint, lint:no-emdash, aliases:check,
type-check (host+client), test:coverage (v8, 70% floor), build, bundle:check,
skills:check. Keep it green. Client UI tests carry a `// @vitest-environment
jsdom` docblock.

## Workflow

1. Read docs/architecture.md and docs/slice-guide.md first.
2. Create/place code per the decision tree: feature (capability entry point),
   entity (domain state, reused), shared (pure infra), root (one-off wiring).
3. Scaffold with `node scripts/create-slice.mjs --side host|client --layer
features|entities|shared --name <kebab> [--ui] [--segment ...]`.
4. Implement, then verify: npm run type-check && npm run lint && npm run
   test:coverage && npm run verify.
5. Build and smoke-install: npm run build && node
   scripts/install-to-profile.mjs --copy (restart dsh web by hand; the script
   never restarts it).
