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
4. `docs/current-dsh-migration.md` - execution plan for aligning with the
   current dsh runtime (0.1.1-rc.2); read this before touching the example
   plugin's RPC, styling, or install flow
5. `docs/fsd-port-plan.md` - the original port plan this repo was built from

## What this repository is

A **template repository** (package name `dsh-plugin-framework`) that is itself
a working, installable, smoke-testable example plugin. To start a new plugin:

1. copy this directory (or `degit` it);
2. **rename everywhere the plugin id appears** (search-and-replace the old
   name case-insensitively): `package.json` (name, dsh.bundle, dsh.client),
   `cordis.patch.yml` + `deploy/cordis.patch.yml` (id), the tsdown banner id in
   `tsdown.config.ts`, and the `export const name` in both `src/index.ts` and
   `src/client/index.tsx`;
3. delete the example slices (`src/features/hello-settings`,
   `src/entities/greeting`, `src/client/features/hello-settings`), then strip
   the imports those slices leave behind in **both assembly roots**:
   `src/index.ts` and `src/client/index.tsx`, and remove their endpoints from
   the contract table in `scripts/generate-typert.mjs`. If you delete ALL
   client UI, the client half may become a no-op apply; the build still
   succeeds.
4. build your own slices on the preserved layer skeleton with
   `node scripts/create-slice.mjs`;
5. iterate locally: `npm run verify` (gates) and `npm run build` (artifacts);
6. smoke-test in a web profile: `dsh plugin --profile web add <spec-or-path>`,
   then restart the profile by hand.

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
.agents/skills/               agent skills (single source, discovered by dsh)
docs/                         architecture, slice guide, decisions, port plan
deploy/                       deployment-only config templates
```

Host and client are **physically isolated**: no code imports across the
boundary. They talk through type contracts (`client/shared/config/context.ts`)
and package-private RPC (`harness.handle` on host, `host.call` on client).

## Commands

| Task          | Command                                         |
| ------------- | ----------------------------------------------- |
| Install       | `npm install`                                   |
| Type-check    | `npm run type-check`                            |
| Lint          | `npm run lint` / `npm run lint:no-emdash`       |
| Format        | `npm run format` / `npm run format:check`       |
| Test          | `npm run test` / `npm run test:coverage`        |
| Alias drift   | `npm run aliases:check`                         |
| Build         | `npm run build` (host tsc + client tsdown)      |
| Bundle verify | `npm run bundle:check`                          |
| Full gate     | `npm run verify`                                |
| New slice     | `node scripts/create-slice.mjs --help`          |
| Smoke install | `dsh plugin --profile web add <spec>` + restart |
| Copy helper   | `node scripts/install-to-profile.mjs --copy`    |

## The example plugin

The framework ships a reference plugin that exercises every layer:

- `entities/greeting` - a domain object with a real rule (blank strings are
  rejected);
- `features/hello-settings/api/register-tool.ts` - registers the
  `hello_world_greet` model Tool;
- `features/hello-settings/api/remote.ts` - `GreetingRemote`, the host half of
  the client-to-host RPC (Typert gateway, dispatched over `/api`);
- `src/client/features/hello-settings/ui/` - a `settings.section` UI that
  reads and edits the greeting via `ctx.remote.greeting` (the generated
  `/remote` contribution is mounted in the client assembly root).

Install it into a web profile (`dsh plugin --profile web add <spec>`, then
restart the profile) and look for **Settings > Hello Framework**.

## Requirements

- Node >= 22.19.0, npm 10.9+
- A dsh web profile for smoke testing (optional for development)

## License

MIT (c) 2026 TecFancy
