# Agent Instructions

Repo-specific rules for any agent (Claude Code, DeepSeek Harness, Codex, ...)
working _on_ this repository. Auto-discovered from the project root.

## What this repo is

`dsh-plugin-framework` - a Feature-Sliced Design scaffold for building dsh
(DeepSeek Harness) Cordis plugins. It is both a template (copy it to start a
new plugin) and a working example plugin that exercises every layer.

Read first: `docs/architecture.md`, `docs/slice-guide.md`,
`docs/decisions.md`. The original port plan is `docs/fsd-port-plan.md`.

## Branch model

Development happens on `development`; `main` only receives merges from
`development` (squash PRs, one conventional commit per PR, so release-please
emits one CHANGELOG entry per change). CI runs on both branches. Never commit
or push to `main` directly - release-please watches `main` pushes, and
`feat`/`fix` commits there would trigger release PRs before the work is
ready. Always work on `development` unless the user says otherwise.

## Commands

| Task             | Command                                                                     |
| ---------------- | --------------------------------------------------------------------------- |
| Type-check       | `npm run type-check` (host + client tsconfigs)                              |
| Lint             | `npm run lint` / `npm run lint:no-emdash`                                   |
| Format           | `npm run format:check` (fix with `npm run format`)                          |
| Test             | `npm run test` / `npm run test:coverage` (v8, 70% floor)                    |
| Aliases drift    | `npm run aliases:check`                                                     |
| Slice boundaries | `npm run slice:check`                                                       |
| Decision records | `npm run decisions:check`                                                   |
| Build            | `npm run build` (host tsc, tsdown client bundle, client d.ts)               |
| Bundle contract  | `npm run bundle:check`                                                      |
| Scenario gates   | `npm run gates` (auto-detects the change surface; pre-push runs this)       |
| Full gate        | `npm run verify` (full set - CI and release; not every local run)           |
| New slice        | `node scripts/create-slice.mjs --side host --layer features --name <kebab>` |

## The two iron laws

1. Host code (`src/**` excluding `src/client/**`) never uses JSX/React.
2. Client code (`src/client/**`) never touches `window`/`document` directly.

## Layer rules

- Host: `src/features` > `src/entities` > `src/shared`; client mirrors under
  `src/client/`. A layer imports only lower layers; host and client never
  import each other (eslint no-restricted-paths zones).
- Every slice exposes an `index.ts` barrel as its only import surface;
  same-layer slices never import each other, even through barrels
  (scripts/verify-slice-boundaries.mjs, fail-closed).
- Imports are relative: host with the `.js` suffix, client with the
  `.ts`/`.tsx` suffix. The `client/*` aliases (aliases.json +
  tsconfig.client.json + vitest resolve.alias, checked by
  scripts/check-aliases.mjs) are available if a plugin prefers alias imports.
- Coupling host<->client only via structural type contracts
  (`src/client/shared/config/context.ts`) and Typert Remote RPC (host
  `TypertRemoteService` + `@Remote`, generated `lib/typert.*` artifacts,
  client `ctx.remote.$mount`), payloads validated by strict codecs.

## Conventions

- Config: schemastery schema exported as `Config` from the plugin root
  (`src/shared/config/plugin-config.ts`); deployment overrides live in the
  USER patch layer, never in the bundle patch.
- Lifecycle: every contribution goes through `ctx.effect` with retained
  disposers; nothing at module scope.
- Tests sit next to code (`<file>.test.ts`); client UI tests carry a
  `// @vitest-environment jsdom` docblock and use explicit vitest imports.
- Static bundles receive cordis services on both halves (`tools`,
  `typertGateway`, `slots`, `remote`, `connection`, ...); there are NO
  `harness`/`host`/`styles` builtins for static bundles - those exist only in
  the dynamic plugin evaluators.
- No em-dash characters in `src/**` (scripts/check-no-emdash.mjs).
- Commit messages: Conventional Commits, types
  feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert, subject in
  English (commitlint, fails closed), no AI-author trailers (`.husky/commit-msg`
  strips known AI tools; human co-authors are kept).

## Gate coverage map

Every rule above is either enforced by a machine or explicitly relies on
humans — nothing is a deaf "suggestion". Violations fail `npm run verify`,
lint-staged (staged files) and CI.

| Rule                                              | Gate                                   |
| ------------------------------------------------- | -------------------------------------- |
| FSD layer direction; host/client boundary         | eslint no-restricted-paths zones       |
| Iron law 1: no JSX/React in host                  | eslint no-restricted-syntax            |
| Iron law 2: no window/document in client          | eslint no-restricted-globals           |
| Slice barrels; no same-layer slice imports        | scripts/verify-slice-boundaries.mjs    |
| No em-dash in `src/**`                            | scripts/check-no-emdash.mjs            |
| `client/*` aliases in sync                        | scripts/check-aliases.mjs              |
| Lockfile registry hosts                           | scripts/check-lockfile-registry.mjs    |
| Decision record lifecycle                         | scripts/verify-decision-records.mjs    |
| Bundle contract                                   | scripts/verify-bundle.mjs              |
| Import suffixes (host `.js`, client `.ts`/`.tsx`) | tsc (NodeNext / Bundler)               |
| Coverage ≥ 70%                                    | vitest v8 thresholds                   |
| Conventional Commits + English subject            | commitlint (`commit-msg`, fail-closed) |
| No AI-author trailers in history                  | `.husky/commit-msg` (auto-strip)       |

Relies on humans (checked in code review, not mechanically enforced):

- Lifecycle: contributions via `ctx.effect` with retained disposers; nothing
  at module scope.
- Static bundles receive cordis services; no `harness`/`host`/`styles`
  builtins.
- Config exported as schemastery `Config` from the plugin root.
- Tests sit next to code; client UI tests carry the jsdom docblock.

## Skills

Agent skills live in `.agents/skills/` (single source; dsh discovers them out
of the box, no mirroring). `.agents/skills/dsh-plugin-development/SKILL.md`
is the deep-dive for plugin work.

## Decision records

Non-trivial decisions (a real alternative was considered and dropped, or a
future agent would re-litigate it) go into `docs/decisions/` as a
`YYYY-MM-DD-slug.{zh,en}.md` pair under `proposed/` → `implemented/` →
`archived/`. Status is expressed by the directory, never by editing content;
archived records are frozen (hash-checked, see
`docs/decisions/README.md`). `npm run decisions:check` enforces the format on
commit and in CI when decision files change.
