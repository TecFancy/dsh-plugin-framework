# Slice guide

How to add or move code in a dsh-plugin-framework based plugin.

## Decision tree: where does new logic go?

1. Is it a brand-new capability with a UI or tool entry point?
   -> a `features` slice (host and/or client).
2. Is it a domain object with state and rules, reused (or about to be reused)
   by 2+ features?
   -> an `entities` slice.
3. Is it a pure utility / config schema / primitive with zero business rules?
   -> a `shared` module.
4. Is it one-off wiring that only the plugin root needs?
   -> keep it in the assembly root (`src/index.ts` or `src/client/index.tsx`)
   until it is reused. FSD rule of thumb: start simple, extract when needed.

## Naming

- Slices and modules: kebab-case (`hello-settings`, `rate-limit`).
- Components: PascalCase (`HelloSettingsSection.tsx`).
- Tests sit next to the code: `<file>.test.ts` / `<file>.test.tsx`.

## Creating a slice by hand

A slice is a directory with an `index.ts` barrel as its ONLY legal import
surface. Nothing outside the slice may reach into `model/`, `ui/`, or `api/`:

```text
src/features/hello-settings/
  index.ts                 barrel: export { ... } from "./api/register-tool.js";
  api/register-tool.ts     implementation
  api/register-tool.test.ts
```

Host slices use relative imports with the `.js` suffix (Node ESM emit
correctness). Client slices use relative imports with the `.ts`/`.tsx` suffix
(identical to dsh-auth-gate's client). The `client/...` path aliases are wired
up too (tsconfig.client.json + vitest resolve.alias, validated by
scripts/check-aliases.mjs) if a plugin prefers alias imports.

## Creating a slice with the scaffold

```bash
node scripts/create-slice.mjs --side host --layer features --name my-feature
node scripts/create-slice.mjs --side client --layer features --name my-feature --ui
node scripts/create-slice.mjs --side host --layer entities --name my-entity
node scripts/create-slice.mjs --side host --layer shared --name my-lib --segment lib
node scripts/create-slice.mjs --side client --layer shared --name my-chip --segment ui
```

The scaffold writes the barrel, a placeholder module, and a test. Fill in the
implementation, then delete the placeholder.

## Client features: the slot dance

A client feature registers itself in the assembly root, not inside the slice:

```tsx
// src/client/index.tsx
ctx.slots.inject("settings.section", () =>
  ctx.slots.register(
    { name: "settings.section", id: "my-feature", order: 200, label: () => "My Feature" },
    () => <MyFeature host={host} />,
  ),
);
```

Query the live slot tree before choosing a target (`Slots.listSubTree` on the
client, or the slot docs in the official skill). Prefer additive inner slots
(`sidebar.footer.action`) over replacing structural slots (`root`, `sidebar`,
`conversation`): replacing an occupant removes its descendants.

## Crossing host and client

1. Add structural types to `src/client/shared/config/context.ts` (never import
   `@deepseek-ai/*` runtime values there);
2. Host: implement `harness.handle("name", handler)` in the owning feature's
   `api/` module (pass the builtin in for testability, see the hello bridge);
3. Client: call `host.call("name", args)` from the UI; keep payloads lossless
   JSON.

## Verifying a new slice

```bash
npm run type-check && npm run lint && npm run test:coverage && npm run verify
```

Coverage thresholds protect the whole repo (70% floor, v8). Integration tests
that exercise the assembled plugin belong next to the assembly roots, not in
individual slices.
