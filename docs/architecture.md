# dsh-plugin-framework: Architecture

A dsh plugin is a Cordis plugin with two physically separate runtimes:

- the **host half** runs in Node inside the dsh process. It registers tools,
  services, events, and HTTP routes;
- the **client half** runs in the browser inside the dsh web app. It mounts
  UI into slots of the host application.

This framework applies Feature-Sliced Design to both halves, cut down from the
six SPA layers of `fsd-react` to the three that matter for plugins.

## The two iron laws

1. **Host code never uses JSX/React.** UI only exists in the client half and
   is mounted through slots. Enforced by ESLint (`no-restricted-syntax` on
   `JSXElement`/`JSXFragment` in `src/**`, excluding `src/client/**`).
2. **Client code never touches `window`/`document`.** The bundle must be
   side-effect free outside the cordis lifecycle. Enforced by ESLint
   (`no-restricted-globals` in `src/client/**`).

## Layer model

Host (under `src/`):

| Layer    | Contains                                           | May import            | May NOT import           |
| -------- | -------------------------------------------------- | --------------------- | ------------------------ |
| features | complete capabilities: tools, endpoint sets, gates | entities, shared      | other features           |
| entities | domain objects and their rules                     | shared                | features, other entities |
| shared   | cross-cutting infra: config, lib, ui utilities     | other shared segments | features, entities       |

Client (under `src/client/`, mirror image):

| Layer    | Contains                        | May import            | May NOT import |
| -------- | ------------------------------- | --------------------- | -------------- |
| features | UI features (slot sections)     | shared                | other features |
| entities | client-side domain state (rare) | shared                | features       |
| shared   | type contracts, primitives      | other shared segments | features       |

The `app` layer of a classic FSD app has no home here: its role collapses into
two **assembly roots**, `src/index.ts` (host) and `src/client/index.tsx`
(client), which may import any layer below them but may not be imported by
anything else.

The rules are enforced by `eslint-plugin-import-x/no-restricted-paths` with
zones generated from the layer-order arrays in `eslint.config.js`. Same-layer
slices may not import each other; when two same-layer modules genuinely depend
on each other, merge them into ONE slice (Strategy A) instead of reaching for
cross-slice bridges.

## The host/client boundary

There are no legal code imports across host and client. The only couplings are:

1. **Type contracts**: structural mirrors in `src/client/shared/config/` that
   describe the service shapes the client needs. They never import
   `@deepseek-ai/*` runtime values;
2. **Package-private RPC**: the host registers methods with the `harness`
   builtin, the client calls them with the `host` builtin (`host.call`).
   Arguments and results must be lossless JSON;
3. **HTTP**: the host serves routes and the client fetches them.

Cross-boundary imports are lint errors at two layers. First, each side's
tsconfig excludes the other (`tsconfig.json` excludes `src/client`;
`tsconfig.client.json` only includes `src/client`), so any host<->client import
is unresolvable in the importing project and fails `import-x/no-unresolved` -
the resolver-level guard that works regardless of path spelling. Second, the
`crossBoundaryZones` in `eslint.config.js` (`no-restricted-paths`) produce the
explicit boundary message when the import resolves far enough to be matched.

## Runner-injected builtins

The dsh runners inject globals into both halves at runtime (see the official
`cordis-plugin-development` skill):

- host: `harness` (`.handle`, `.registerTool`, ...), `ctx`, `console`;
- client: `host` (`.call`), `React`, `ctx`, `styles`, `console`.

Ambient declarations live in `src/global.d.ts` and `src/client/global.d.ts`.
Runtime access must be guarded (`typeof harness === "undefined"`) so that code
degrades gracefully outside the runner (unit tests, module eval).

## Configuration surface

Plugins declare their configuration as a schemastery schema exported as `Config`
from the plugin root (`src/shared/config/plugin-config.ts`). The cordis loader
validates and defaults it, then passes the merged config to `apply(ctx, config)`.
Deployment overrides belong in the USER patch layer, never in the bundle patch
(`deploy/cordis.patch.yml` shows the shape).

## Lifecycle

Every contribution must be removable: use `ctx.effect(fn, label)` for
subscriptions and side effects, retain disposers returned by registration
APIs, and return a disposer from `apply` effects. Nothing may run at module
scope.
