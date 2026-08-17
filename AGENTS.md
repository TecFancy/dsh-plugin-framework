# Agent Instructions

Repo-specific rules for any agent (Claude Code, DeepSeek Harness, Codex, ...)
working _on_ this repository. Auto-discovered from the project root.

## What this repo is

`dsh-plugin-framework` - a Feature-Sliced Design scaffold for building dsh
(DeepSeek Harness) Cordis plugins. It is both a template (copy it to start a
new plugin) and a working example plugin that exercises every layer.

Read first: `docs/architecture.md`, `docs/slice-guide.md`,
`docs/decisions.md`. The original port plan is `docs/fsd-port-plan.md`.

## Commands

| Task            | Command                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| Type-check      | `npm run type-check` (host + client tsconfigs)                              |
| Lint            | `npm run lint` / `npm run lint:no-emdash`                                   |
| Format          | `npm run format:check` (fix with `npm run format`)                          |
| Test            | `npm run test` / `npm run test:coverage` (v8, 70% floor)                    |
| Aliases drift   | `npm run aliases:check`                                                     |
| Build           | `npm run build` (host tsc, tsdown client bundle, client d.ts)               |
| Bundle contract | `npm run bundle:check`                                                      |
| Skills sync     | `npm run skills:sync` / `npm run skills:check`                              |
| Full gate       | `npm run verify` (must stay green)                                          |
| New slice       | `node scripts/create-slice.mjs --side host --layer features --name <kebab>` |

## The two iron laws

1. Host code (`src/**` excluding `src/client/**`) never uses JSX/React.
2. Client code (`src/client/**`) never touches `window`/`document` directly.

## Layer rules (enforced by ESLint no-restricted-paths)

- Host: `src/features` > `src/entities` > `src/shared`; client mirrors under
  `src/client/`. A layer imports only lower layers; same-layer slices never
  import each other; host and client never import each other.
- Every slice exposes an `index.ts` barrel as its only import surface.
- Imports are relative: host with the `.js` suffix, client with the
  `.ts`/`.tsx` suffix. The `client/*` aliases (aliases.json +
  tsconfig.client.json + vitest resolve.alias, checked by
  scripts/check-aliases.mjs) are available if a plugin prefers alias imports.
- Coupling host<->client only via structural type contracts
  (`src/client/shared/config/context.ts`) and RPC (`harness.handle` /
  `host.call`), payloads lossless JSON.

## Conventions

- Config: schemastery schema exported as `Config` from the plugin root
  (`src/shared/config/plugin-config.ts`); deployment overrides live in the
  USER patch layer, never in the bundle patch.
- Lifecycle: every contribution goes through `ctx.effect` with retained
  disposers; nothing at module scope.
- Tests sit next to code (`<file>.test.ts`); client UI tests carry a
  `// @vitest-environment jsdom` docblock and use explicit vitest imports.
- Runner-injected builtins (`harness` on host, `host` on client) are ambient
  (src/global.d.ts, src/client/global.d.ts) and must be guarded with
  `typeof x === "undefined"` before use.
- No em-dash characters in `src/**` (scripts/check-no-emdash.mjs).
- Commit messages: Conventional Commits, types
  feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert (commitlint),
  subject in English, no AI-author trailers.

## Skills

Agent skills live in `skills/` (source of truth) and are mirrored to
`.claude/skills/` and `.opencode/skills/` by `npm run skills:sync`.
`skills/dsh-plugin-development/SKILL.md` is the deep-dive for plugin work.
