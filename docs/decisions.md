# Decisions

Recorded decisions and deviations taken while porting the fsd-react scaffold
into this plugin framework. The full port plan is `docs/fsd-port-plan.md`.

## D1. Three layers, not six

Adopted: host `features/entities/shared` + client mirror. Rejected: `app`,
`pages`, `widgets` as real directories.

Why: a plugin mounts into the dsh host's pages; it has no routing (`pages`),
no app shell (`app`), and only rarely shares UI blocks across multiple slots
(`widgets`). The `app` role collapses into the two assembly roots
(`src/index.ts`, `src/client/index.tsx`).

## D2. Relative imports on BOTH sides; aliases shipped as available infra

Adopted: host code imports with relative paths plus the `.js` suffix; client
code imports with relative paths plus the `.ts`/`.tsx` suffix (the same
verified client pattern as dsh-auth-gate). The `client/*` path aliases are
fully wired up (tsconfig.client.json paths, vitest resolve.alias, aliases.json
validated by `scripts/check-aliases.mjs`) and teams MAY switch to them, but the
canonical example uses relative imports.

Why: tsc does not rewrite path-mapped specifiers at emit time, so host code
(Node ESM) cannot use aliases without breaking at runtime. On the client side
aliases type-check fine, but the import-x / eslint-import-resolver-typescript
chain does not resolve `paths` reliably once `baseUrl` is gone (deprecated in
TS 6), so linting would flag valid alias imports. Relative imports are short
at plugin depth and behave identically everywhere; the alias mechanism stays
available for bigger plugins that want it.

## D3. Config uses schemastery, not zod

Adopted: `@deepseek-ai/schemastery` (imported as `z`) for the exported
`Config` schema. Rejected: zod from the original plan draft.

Why: cordis's own config loader is built around schemastery schemas; the
schema object is part of the plugin's runtime surface and must be in
`dependencies` (it is not a dev-only concern).

## D4. No Steiger, no betterer, no Stylelint in v0.1

Adopted: FSD layering is enforced entirely by
`eslint-plugin-import-x/no-restricted-paths` (zero extra runtime deps).

Rejected: Steiger (its `insignificant-slice` rule would fire on the small
slice counts typical of plugins), betterer (its alpha toolchain adds a
committed baseline file that small plugin repos must keep regenerating), and
Stylelint (no design-token pipeline - the client styles are CSS Modules
inlined into the single bundle; theme colors come from the host's theme
service as CSS variables).

Revisit Steiger/betterer when a plugin's slice count grows materially; the
port plan's section 5 lists exact thresholds to copy back.

## D5. Coverage floor starts at 70%

Adopted: 70/70/70/70 v8 thresholds. The dsh-auth-gate baseline is 80, but a
small example plugin's coverage swings wildly on a few uncovered one-off
lines. Raise to 80 when the plugin accumulates real behavior.

## D6. No design-token pipeline, no env system

Rejected: the `tokens.json` -> SCSS/TS generator and the `.env`/`env.d.ts`
layer from fsd-react. Plugin colors consume the host theme's CSS variables
(`var(--dsw-*)`); plugin configuration is the cordis `Config` schema, not
build-time environment injection.

## D7. React 18 for the client runtime

Adopted: React 18 (matching dsh-auth-gate's verified setup). The web app's
module table provides React; the bundle only externalizes
`react` / `react/jsx-runtime`. Bump only when the installed dsh web app
ships a newer React.

## D8. The framework repo is its own smoke test

The framework is shipped as an installable plugin (`dsh-plugin-framework`)
that demonstrates every layer: entity, host tool, host bridge, client slot
section. New plugins copy the repo and delete the example slices; they never
start from an empty directory with no working example to imitate.

## D9. Install-to-profile never restarts the web server

`scripts/install-to-profile.mjs` copies artifacts and prints commands, but
deliberately does not restart dsh web: a restart terminates the running GUI
session. Restarting is a human step.

## D10. Em-dash and style gates

Borrowed from fsd-react: `scripts/check-no-emdash.mjs` (ASCII hyphen only in
`src/**`) and Prettier with print width 100. Enforced in `npm run verify`.

## D11. Static RPC uses the Typert gateway, never harness/host builtins

Adopted: `GreetingRemote extends TypertRemoteService` with `@Remote`
endpoints, generated `./typert` and `./remote` artifacts, client
`ctx.remote.$mount()`.

Rejected: `harness.handle` / `host.call`. Those builtins are injected only by
the DYNAMIC plugin evaluators (`cordis-host-runner` / `cordis-client-runner`);
the current web profile mounts no static equivalent, so a static bundle that
relies on them silently degrades (the old bridge warned, the UI threw).

The official generator (`@deepseek-ai/dsh-typert-generator`) cannot run in
this repo: its analyzer discovers contributors through project references of
`tsconfig.host.json` and requires referenced packages under `<root>/packages`
(monorepo-only by design). This scaffold therefore ships
`scripts/generate-typert.mjs`, which emits the same artifact format from the
`@Remote` decorators in source and fails the build when they drift. If the
plugin ever moves into a monorepo, swap the script for
`typertPlugin({ mode: "package" })`.

## D12. CSS is inlined at build time with lightningcss

Adopted: tsdown plugins in `tsdown.config.ts` compile `.module.css` (hashed
class map) and plain `.css`/`?inline` imports with lightningcss and inject
`<style data-plugin-css>` tags at factory execution, exactly like the official
client bundle preset.

Rejected: the previous pipeline that extracted `lib/style.css` and embedded it
through a `styles.insert` runner builtin. The builtin exists only in the
dynamic client evaluator, so static bundles shipped unstyled (silently, due to
the guard). The injected style tags are build output, not source: iron law 2
(`src/client/**` never touches `window`/`document`) is unchanged.

## D13. Patch overrides are bare id rows

`deploy/cordis.patch.yml` uses the current patch contract: an id-targeted row
`- id: dsh-plugin-framework` whose `config` REPLACES the row's whole config.
The previous `- set:` wrapper was not a patch operation and would have been
treated as an unknown key.

## D14. Official install flow

Distribution stays npm/tarball-first (`prepack` builds and verifies), and
smoke installation is `dsh plugin --profile web add <spec>` followed by a
manual restart (the script never restarts the server, see D9). Git installs
are supported only with a self-contained `prepare` build plus the user's pnpm
`allowBuilds` entry, per the official publish docs.
