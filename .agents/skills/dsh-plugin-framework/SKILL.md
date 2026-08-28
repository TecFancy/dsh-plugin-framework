---
name: dsh-plugin-framework
description: Operation manual for the example plugin shipped with the dsh-plugin-framework scaffold: the hello_world_greet tool and the Hello Framework settings section, which read and edit the plugin's greeting through the host bridge.
---

# dsh-plugin-framework plugin manual

The framework repo is itself a working example plugin. It demonstrates every
layer of the scaffold with the smallest possible feature set.

## What it exposes

- Tool `hello_world_greet` - returns the current greeting text
  (`{ "text": "..." }`).
- Settings section "Hello Framework" (settings.section slot) - lets a user
  edit the greeting; the client UI reads/writes it through the package-private
  bridge:
  - host methods: `hello.getGreeting`, `hello.setGreeting` (registered with
    `harness.handle`);
  - client side: `host.call("hello.getGreeting")` /
    `host.call("hello.setGreeting", text)`.

## Behavior

- The greeting defaults to "Hello from dsh-plugin-framework" (config key
  `defaultGreeting`, deployable via the user patch layer, see
  deploy/cordis.patch.yml).
- Empty or whitespace-only strings are rejected by the entity (domain rule)
  and the previous value is kept.

## Using it as a template

1. Copy the repo; rename the plugin id EVERYWHERE: package.json (name,
   dsh.bundle, dsh.client), cordis.patch.yml + deploy/cordis.patch.yml (id),
   the tsdown banner id in tsdown.config.ts, and `export const name` in both
   `src/index.ts` and `src/client/index.tsx`.
2. Delete the example slices (`src/features/hello-settings`,
   `src/entities/greeting`, `src/client/features/hello-settings`) AND strip the
   leftover imports in both assembly roots (`src/index.ts`,
   `src/client/index.tsx`) so the roots compile again. Deleting all client UI
   is fine: the build's CSS inliner skips gracefully when no stylesheet is
   produced.
3. Build your own slices with the create-slice scaffold and keep `npm run
verify` green.
