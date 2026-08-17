# dsh-plugin-framework

Feature-Sliced Design scaffold for building **maintainable dsh (DeepSeek
Harness) plugins**. It transplants the architectural discipline of
[fsd-react](https://github.com/fsd-template/fsd-react) into the reality of a
Cordis plugin: a host half that runs in Node and a client half that ships as a
single externalized browser bundle.

Start by reading, in order:

1. `docs/architecture.md` - the layering model and the two iron laws
2. `docs/slice-guide.md` - how to add a slice, feature, or shared module
3. `docs/decisions.md` - why the framework looks the way it does
4. `docs/fsd-port-plan.md` - the original port plan this repo was built from

## What this repository is

A **template repository** (package name `dsh-plugin-framework`) that is itself
a working, installable, smoke-testable example plugin. To start a new plugin:

1. copy this directory (or `degit` it), rename the package, delete the example
   slices (`src/features/hello-settings`, `src/entities/greeting`,
   `src/client/features/hello-settings`), then build your own slices on the
   preserved layer skeleton;
2. run `node scripts/create-slice.mjs` to scaffold compliant slices;
3. iterate locally: `npm run verify` (gates) and `npm run build` (artifacts);
4. smoke-test in a web profile with `node scripts/install-to-profile.mjs`.

See `docs/slice-guide.md` for the full checklist.

## Layout at a glance

```text
src/
  index.ts                    host root: name / inject / Config / apply(ctx)
  features/<slice>/           complete business capabilities (tools, endpoints)
  entities/<slice>/           domain objects and their rules
  shared/<segment>/<module>/  cross-cutting infra (config, lib, ui)
  client/
    index.tsx                 client root: slot registrations
    features/<slice>/         UI features (slot sections)
    shared/<segment>/         client-side contracts and primitives
scripts/                      tooling gates and generators
skills/                       agent skills (synced to .claude/, .opencode/)
docs/                         architecture, slice guide, decisions, port plan
deploy/                       deployment-only config templates
```

Host and client are **physically isolated**: no code imports across the
boundary. They talk through type contracts (`client/shared/config/context.ts`)
and package-private RPC (`harness.handle` on host, `host.call` on client).

## Commands

| Task          | Command                                        |
| ------------- | ---------------------------------------------- |
| Install       | `npm install`                                  |
| Type-check    | `npm run type-check`                           |
| Lint          | `npm run lint` / `npm run lint:no-emdash`      |
| Format        | `npm run format` / `npm run format:check`      |
| Test          | `npm run test` / `npm run test:coverage`       |
| Alias drift   | `npm run aliases:check`                        |
| Skills sync   | `npm run skills:sync` / `npm run skills:check` |
| Build         | `npm run build` (host tsc + client tsdown)     |
| Bundle verify | `npm run bundle:check`                         |
| Full gate     | `npm run verify`                               |
| New slice     | `node scripts/create-slice.mjs --help`         |
| Smoke install | `node scripts/install-to-profile.mjs --copy`   |

## The example plugin

The framework ships a reference plugin that exercises every layer:

- `entities/greeting` - a domain object with a real rule (blank strings are
  rejected);
- `features/hello-settings/api/register-tool.ts` - registers the
  `hello_world_greet` model Tool;
- `features/hello-settings/api/bridge.ts` - host half of the bridge
  (`harness.handle`);
- `src/client/features/hello-settings/ui/` - a `settings.section` UI that
  reads and edits the greeting via `host.call`.

Install it into a web profile (`node scripts/install-to-profile.mjs --copy`,
then restart dsh web) and look for **Settings > Hello Framework**.

## Requirements

- Node >= 22.19.0, npm 10.9+
- A dsh web profile for smoke testing (optional for development)

## License

MIT (c) 2026 TecFancy
