# Migration plan: align with the current dsh runtime (0.1.1-rc.2)

Status: EXECUTED (see `docs/decisions.md` D11-D14 for what was adopted). This
document stays as the record of the plan and its evidence. One deviation from
the plan's primary path was taken: W1 uses **fallback A** - the generated
artifacts are emitted by `scripts/generate-typert.mjs` in the official
generator's format instead of `typertPlugin({ mode: "package" })`, because
the official generator discovers contributors only inside a monorepo (see
D11). Re-verify the version table below against a fresh harness checkout
whenever the installed dsh upgrades.

## Goal and non-goals

Goal: the example plugin works end-to-end on the current dsh, installed with
the official flow (`dsh plugin --profile web add <spec>`, restart `dsh web`),
with host tool, host state, settings UI, and client styling all functioning.

Non-goals: dynamic Cordis plugins (`cordis_define`/`cordis_run`, plain
JavaScript, no build step), new features, changes to the FSD layer model, or
dropping the engineering gates.

## Evidence snapshot

Verification was done against a shallow clone of
`github.com/deepseek-ai/deepseek-harness` (kept at `/tmp/deepseek-harness` on
the authoring machine) and the installed dsh CLI at
`~/.volta/tools/image/node/24.13.1/lib/node_modules/@deepseek-ai/dsh`. Pin the
following versions when re-verifying:

| Package                             | Version    | Where it comes from             |
| ----------------------------------- | ---------- | ------------------------------- |
| `@deepseek-ai/cordis`               | 4.0.1      | `vendor/cordis` (vendored fork) |
| `@deepseek-ai/schemastery`          | 3.18.1     | `vendor/schemastery`            |
| `@deepseek-ai/dsh-tools`            | 0.1.1-rc.2 | `packages/core/tools`           |
| `@deepseek-ai/dsh-typert-protocol`  | 0.1.1-rc.2 | `packages/typert/protocol`      |
| `@deepseek-ai/dsh-typert-generator` | 0.1.1-rc.2 | `packages/typert/generator`     |
| dsh CLI                             | 0.1.1-rc.2 | `apps/cli`                      |

What still matches, verified byte-for-byte: the bundle manifest
(`dsh.bundle.patch`), the patch row shape (`insert` rows referencing the
package by name), the client loader contract
(`window.__ModuleLoader__.load({ id, factory })` CJS closure,
`exports["./client"]`), the client externals `react` / `react/jsx-runtime`
(seeded by `PLATFORM_MODULES` in `packages/client/web/src/platform.ts`), the
host plugin shape (`name`, `inject`, `apply`, `ctx.effect`), the tool
registration pattern (`ctx.tools.register(defineTool(...))` from
`@deepseek-ai/dsh-tools`), the slot registration pattern
(`ctx.slots.inject(name, () => ctx.slots.register(...))`), and the
`settings.section` slot contract (`id`, `order`, `label: string | (() => string)`).

What drifted (each item below is a work item): the RPC builtins, the patch
operation in the deploy template, the CSS pipeline, and the
`dsh.client.inject` metadata.

## W1. Replace the host/client RPC with a Typert Remote

The example's `harness.handle` / `host.call` bridge is the **dynamic** plugin
RPC surface (`packages/extensions/cordis-host-runner`,
`packages/extensions/cordis-client-runner`). Static bundles have neither
builtin: on the current web app the host side reaches the browser through
`ctx.apiProxy` + `ctx.typertGateway` (`packages/api/gateway`), and the client
side talks through `ctx.connection` and mounts generated Remote contributions
with `ctx.remote.$mount()` (`packages/api/remotes`,
`docs/capability-seams.md`). The canonical in-box example is
`packages/host/plugin-inventory`.

### Host half

1. Add `@deepseek-ai/dsh-typert-protocol` as a dependency (it is a runtime
   import: `TypertRemoteService`, `Remote`).
2. New module `src/features/hello-settings/api/remote.ts`:

   ```ts
   import { Context } from "@deepseek-ai/cordis";
   import { TypertRemoteService, Remote } from "@deepseek-ai/dsh-typert-protocol";
   import type { GreetingService } from "../../../entities/greeting/index.js";

   export class GreetingRemote extends TypertRemoteService {
     static inject = ["tools"]; // only when the service itself needs ctx.tools

     constructor(
       ctx: Context,
       private readonly greeting: GreetingService,
     ) {
       super(ctx, "greeting");
     }

     @Remote("getGreeting")
     getGreeting(): string {
       return this.greeting.getGreeting();
     }

     @Remote("setGreeting")
     setGreeting(value: string): string {
       this.greeting.setGreeting(value);
       return this.greeting.getGreeting();
     }
   }
   ```

   Verify the exact `@Remote` name rules and the constructor shape against
   `packages/typert/protocol/README.md` and `packages/host/plugin-inventory/src/index.ts`
   before writing code (do not infer; the base class owns how the namespace
   registers with the gateway).

3. Mount it in `apply()` as a child fiber and keep it disposable:

   ```ts
   const remote = ctx.plugin(GreetingRemote, { args: [greeting] });
   // ctx.plugin returns a fiber; dispose handling stays automatic with the parent.
   ```

   `ctx.plugin(childPlugin)` is the documented child-fiber mechanism
   (`docs/user/develop/framework/index.md`, "Nested contexts"). Alternative if
   child-mounting does not register with the gateway: export the service from
   the package root and add a second patch row with a subpath entry
   (`name: dsh-plugin-framework/greeting-service`), the pattern
   `docs/user/develop/basic/publish.md` shows for surface bundles
   (`dsh-hello-plugin/startup`). Decide during implementation, prefer the
   single-row form.

4. Delete `src/features/hello-settings/api/bridge.ts` and the `harness`
   ambient declaration in `src/global.d.ts`; rewrite their tests.

### Build half (generated artifacts)

5. Add `@deepseek-ai/dsh-typert-generator` as a devDependency and wire its
   tsdown plugin into the host build pass of `tsdown.config.ts`:

   ```ts
   import { typertPlugin } from "@deepseek-ai/dsh-typert-generator/tsdown";
   // add: plugins: [typertPlugin({ mode: "package" })] to the host config
   ```

   `mode: "package"` emits only the package being bundled (confirmed in
   `packages/typert/generator/src/tsdown-plugin.ts`); the plugin skips
   packages whose manifest declares no Typert or Remote export, so declare
   both subpaths in `package.json`:

   ```json
   "exports": {
     ".": { "types": "./lib/index.d.ts", "default": "./lib/index.js" },
     "./remote": {
       "types": "./lib/typert.remote-client.d.ts",
       "default": "./lib/typert.remote-client.js"
     },
     "./typert": {
       "types": "./lib/typert.host.d.ts",
       "default": "./lib/typert.host.js"
     },
     "./client": { "types": "./lib/client/index.d.ts", "default": "./lib/client.js" },
     "./cordis.patch.yml": "./cordis.patch.yml",
     "./skills/*": "./skills/*",
     "./package.json": "./package.json"
   }
   ```

   Also add the generated files to the `files` allowlist. Inspect the emitted
   artifacts once: note what they import at runtime (the generator emits Zod
   codecs; the client bundle must inline those, the host half must resolve
   them from the plugin's own dependencies) and adjust the tsdown externals
   (`neverBundle`/`alwaysBundle`) accordingly. The in-box preset inlines
   everything not requested from the module table, which is the rule to copy.

### Client half

6. `src/client/index.tsx` changes:
   - `inject` becomes `["slots", "remote"]` (the `remote` service is provided
     by the current client roster through `@deepseek-ai/dsh-api-remotes` /
     `@deepseek-ai/dsh-api-gateway/client`; services are shared across the
     client fiber tree, so an out-of-tree bundle can inject it).
   - `apply` mounts the generated contribution:

     ```ts
     import greetingRemote from "dsh-plugin-framework/remote";

     export const inject = ["slots", "remote"] as const;

     export async function apply(ctx: HelloClientContext): Promise<void> {
       const unmount = await ctx.remote.$mount(greetingRemote);
       ctx.effect(() => unmount);
       // slot registration unchanged
     }
     ```

     `ctx.remote.$mount()` returns a disposer; retain it (see
     `packages/api/remotes/src/client/index.ts` for the mount/dispose recipe).

   - The section now calls `ctx.remote.greeting.getGreeting()` /
     `ctx.remote.greeting.setGreeting(value)` instead of `host.call`. Pass the
     typed handle down as a prop; keep payloads plain JSON (Typert codecs
     enforce this on the wire).
7. Delete the `host` ambient declaration from `src/client/global.d.ts` and the
   `HostBridge` type from `src/client/shared/config/context.ts`; the client
   contract now derives from the generated `/remote` declaration merge.
8. Note the self-import: `dsh-plugin-framework/remote` resolves through the
   package's own exports and is inlined into `lib/client.js` by tsdown (the
   loader serves one file per package, so the contribution must not stay an
   external import).

### Verification

- Host: unit tests for `GreetingRemote` with a stubbed context; assert the
  `@Remote` metadata exists as the protocol expects.
- Client: jsdom tests mounting a stub remote contribution and rendering the
  section (do not import `@deepseek-ai/dsh-api-gateway` values in the bundle;
  keep the test stub structural).
- End to end (the real gate): `npm run build`, then
  `dsh plugin --profile web add .` (or `add ./dsh-plugin-framework-<ver>.tgz`),
  restart `dsh web`, open Settings > Hello Framework, verify read, save,
  rejection of blank values, and that
  `curl http://127.0.0.1:3080/plugins/dsh-plugin-framework/client.js` serves
  the bundle.

## W2. Fix the deploy patch template

`deploy/cordis.patch.yml` uses a `- set:` wrapper that does not exist. The
current patch contract (`vendor/include/src/index.ts`, `PatchOptions`) is
`{ id?, insert?, name?, ...overrides }`: an id-targeted override is a bare
row, and it replaces the target row's whole `config` (restate every key, not
just the changed one).

```yaml
- id: dsh-plugin-framework
  config:
    defaultGreeting: "Hello from production"
```

Update the comment block to state the restate-everything rule and the layer
order (bundle layers, then the profile `cordis.patch.yml`, then
`$DSH_HOME/cordis.patch.yml`, then `--patch` overlays; later layers win).

Optional hardening: a CI script that parses `cordis.patch.yml` and
`deploy/cordis.patch.yml` against the include package's patch semantics
(`@deepseek-ai/cordis-plugin-include@1.0.6`, already a dependency of the dsh
CLI). Check which validation surface the published package exports before
wiring this; if nothing is exported, validate shape with a small hand-rolled
check instead.

## W3. Replace the CSS pipeline

The `styles.insert` builtin only exists in the dynamic client runner. The
current static preset compiles CSS inside the bundle with lightningcss and
injects a tagged style element at factory execution
(`packages/client/tsdown.client.ts`, `styleInjectionModule`). Port that
mechanism:

1. Add `lightningcss` as a devDependency; drop `@tsdown/css` if nothing else
   uses it.
2. In `tsdown.config.ts`, add three virtual-module plugins mirroring the
   official ones: CSS Modules (`x.module.css` -> hashed class map +
   injection), `x.css?inline` (compiled text export), and plain `.css`
   (global injection). The injected code creates
   `document.createElement("style")` with `data-plugin` and `data-plugin-css`
   attributes, guarded so it runs once. Keep the `react` /
   `react/jsx-runtime` externals and the CJS closure banner/footer unchanged.
3. Delete `scripts/normalize-client-bundle.mjs` (its two jobs - embedding the
   stylesheet and stripping stray CSS imports - both disappear) and remove it
   from the `build` script chain.
4. Update `scripts/verify-bundle.mjs` assertions: single file, loader
   contract intact, the factory contains the style injection, and the bundle
   no longer references a `styles` global.
5. Iron law 2 is unchanged: `src/client/**` source still never touches
   `window`/`document`; the generated injection code is build output, exactly
   like the official preset's.

## W4. Fix `dsh.client.inject` metadata

`@deepseek-ai/dsh-client-ui-slots` is a pure contract library (no `dsh.client`
manifest, no `./client` export, no roster row) and must not appear as an
inject edge. The inject list is informational (preflight display, HMR
diffing) but should name real roster rows the plugin actually leans on. At
implementation time, mirror the roster entries the client half consumes, for
example:

```json
"client": {
  "inject": [
    "@deepseek-ai/dsh-client-runtime",
    "@deepseek-ai/dsh-client-ui-renderer",
    "@deepseek-ai/dsh-api-remotes"
  ],
  "platform": "web"
}
```

Confirm the exact list against `packages/bundle/web-app/cordis.patch.yml`
(the client roster) and against in-box consumers such as
`packages/client/ui-settings/package.json`.

## W5. Rewrite the drifted documentation and ambient types

1. `docs/architecture.md`, section "Runner-injected builtins": split static
   vs dynamic. Static host plugins get cordis services (`tools`, `apiProxy`,
   `typertGateway`, `settings`, ...); static client plugins get services
   (`slots`, `connection`, `remote`, ...) and module-table externals
   (`react`, `react/jsx-runtime`). The `harness`/`host`/`styles` builtins
   belong to dynamic plugins only.
2. `docs/slice-guide.md`, section "Crossing host and client": replace the
   `harness.handle`/`host.call` recipe with the Typert Remote recipe from W1.
3. `skills/dsh-plugin-development/SKILL.md`: same corrections; point at
   `docs/user/develop/` (lifecycle, services, events), `publish.md`, and
   `packages/client/AGENTS.md` as the authoritative static-plugin references,
   and keep the official dynamic-plugin skill clearly labeled as out of scope
   for this scaffold.
4. `src/global.d.ts` and `src/client/global.d.ts`: remove the `harness`,
   `host`, and `styles` ambient declarations; keep only what static plugins
   actually receive.
5. `README.md`: replace the smoke-test paragraph with the official install
   flow and note the git-install caveat (a git spec needs a self-contained
   `prepare` build plus a pnpm allowBuilds entry; npm/tarball installs ship
   prebuilt `lib/` and need nothing).

## W6. Distribution and install flow

1. Keep publishing via npm or tarball as the primary path (`prepack` already
   builds and verifies the bundle). If git-install support is wanted later,
   extend `prepare` to build self-contained (the current `prepare` only wires
   husky) and document the pnpm `allowBuilds` step from `publish.md`.
2. Simplify `scripts/install-to-profile.mjs`: the `--copy` shortcut stays
   valid only for `link:` installs into a pnpm-managed profile; otherwise the
   script should print the `dsh plugin --profile <name> add <spec>` commands
   and the restart note. Never restart the server from the script (existing
   decision D9 holds).
3. Remember the startup boundary: bundle membership changes (add/remove/
   update) require a profile restart; ordinary `cordis.patch.yml` edits in the
   user layers hot-reload.

## Rollout order

Each item ends with `npm run verify` green; W2 and W4 are independent and
trivial, do them first so the config surface is correct while the bigger
pieces land.

1. W2 (deploy patch) + W4 (manifest metadata) - low risk, no runtime change.
2. W3 (CSS pipeline) - build-only change; the UI must come out styled.
3. W1 (Typert Remote) - the functional core; land last of the code changes so
   every verification step before it still builds against the current dsh.
4. W5 (docs/types) together with W1, since the docs describe W1's mechanism.
5. W6 (distribution) after the end-to-end smoke passes.
6. Add decision records to `docs/decisions.md`: D11 (static RPC via Typert
   Remote, replacing `harness`/`host`), D12 (lightningcss in-bundle styling,
   replacing the `styles` builtin), D13 (deploy patch uses bare id rows, no
   `set` op), D14 (official `dsh plugin add` install flow).

## Risks and fallbacks

- **Typert generation outside the monorepo.** `typertPlugin({ mode:
"package" })` is designed for a single package, but the out-of-tree wiring
  is the least proven step. Fallback A: hand-maintain the two generated
  artifacts (`lib/typert.host.js`, `lib/typert.remote-client.js`), using
  `packages/host/plugin-inventory`'s emitted files as the template - fine for
  a two-method demo, weak for a growing plugin. Fallback B: drop custom RPC
  entirely and register the greeting through the shipped settings registry
  (`ctx.settings.register(ns, schema, options)` in
  `packages/settings/settings`, with the standard settings plane over
  `ctx.connection` on the client). Fallback B changes the demo's semantics
  (settings become durable) but uses no generated code and is the most
  idiomatic path for a settings feature.
- **Version drift.** All peer ranges must stay compatible with the pinned
  snapshot table above; re-run the alignment check whenever the installed dsh
  upgrades (compare against a fresh clone of the matching tag).
- **Slot/roster drift.** `settings.section` and the client roster are
  composition-defined; if a future dsh moves them, re-query the live slot
  tree (`Slots.listSubTree`) and the web-app patch before adjusting.

## References

Repository paths are relative to a deepseek-harness checkout at the pinned
generation:

- `docs/user/develop/basic/publish.md` - bundle manifest, patch rows, install
  and layer order, git-install caveat.
- `docs/user/develop/basic/tool.md` - static tool registration via
  `defineTool`.
- `docs/user/develop/framework/index.md`, `service.md`, `events.md` - static
  plugin lifecycle and services.
- `docs/capability-seams.md` - `ctx.connection`, `ctx.apiProxy`,
  `ctx.typertGateway` seams.
- `packages/client/AGENTS.md` - client package checklist, `dsh.client`
  semantics, slot registration rules.
- `packages/client/tsdown.client.ts` - the official client bundle preset
  (loader contract, CSS inlining, purity gate).
- `packages/host/plugin-inventory/` - the in-box Typert Remote example
  (service, `@Remote`, generated `./remote` + `./typert` exports).
- `packages/typert/protocol/`, `packages/typert/generator/` - Remote protocol
  and the `typertPlugin({ mode: "package" })` generator face.
- `packages/api/gateway/`, `packages/api/remotes/` - `ctx.typertGateway`,
  `ctx.remote.$mount`, `ctx.remote.$on`.
- `apps/cli/config/agent-presets/cordis/skills/cordis-plugin-development/SKILL.md`
  - dynamic-plugin surface (explicitly out of scope here; cited only to mark
    the boundary).

## Appendix: file change map

| File                                                             | Change                                                                                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/features/hello-settings/api/remote.ts`                      | new: `GreetingRemote` service                                                                                                                                                         |
| `src/features/hello-settings/api/bridge.ts`                      | delete                                                                                                                                                                                |
| `src/index.ts`                                                   | mount `GreetingRemote` via `ctx.plugin`                                                                                                                                               |
| `src/global.d.ts`                                                | remove `harness` ambient                                                                                                                                                              |
| `src/client/index.tsx`                                           | inject `remote`, mount `/remote` contribution                                                                                                                                         |
| `src/client/features/hello-settings/ui/HelloSettingsSection.tsx` | call `ctx.remote.greeting.*` instead of `host.call`                                                                                                                                   |
| `src/client/global.d.ts`                                         | remove `host`/`styles` ambient                                                                                                                                                        |
| `src/client/shared/config/context.ts`                            | replace `HostBridge` with the generated remote handle                                                                                                                                 |
| `tsdown.config.ts`                                               | typert plugin (host pass), lightningcss CSS plugins                                                                                                                                   |
| `scripts/normalize-client-bundle.mjs`                            | delete                                                                                                                                                                                |
| `scripts/verify-bundle.mjs`                                      | new assertions (style injection, no `styles` global)                                                                                                                                  |
| `package.json`                                                   | deps: `@deepseek-ai/dsh-typert-protocol`; devDeps: `@deepseek-ai/dsh-typert-generator`, `lightningcss`; exports `./remote` + `./typert`; `files` additions; fixed `dsh.client.inject` |
| `deploy/cordis.patch.yml`                                        | bare `- id:` row, no `set` op                                                                                                                                                         |
| `docs/architecture.md`, `docs/slice-guide.md`, `README.md`       | rewrite builtins/RPC/smoke-test sections                                                                                                                                              |
| `skills/dsh-plugin-development/SKILL.md`                         | same corrections                                                                                                                                                                      |
| `docs/decisions.md`                                              | add D11-D14                                                                                                                                                                           |
| `scripts/install-to-profile.mjs`                                 | align with `dsh plugin add` flow                                                                                                                                                      |
