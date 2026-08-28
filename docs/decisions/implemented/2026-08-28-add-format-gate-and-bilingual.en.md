# Add a format-check script, and keep the Chinese/English bilingual triple

## Decision

Reverse the "skip bilingual, skip the script for now" parts of [2026-08-28-decision-record-lifecycle](./2026-08-28-decision-record-lifecycle.en.md):

1. Every record under `implemented/` and `archived/` must have both a `.zh.md` and an `.en.md` file (`proposed/` may stay single-language, to keep friction low during exploration).
2. Add `scripts/verify-decision-records.mjs`, which checks filename format, required sections, bilingual pairing, and whether archived records have been altered. It is exposed as `npm run decisions:check`, run on commit via lint-staged (husky pre-commit), and also present in the `verify` chain and CI.

## Context

Before a habit is formed, relying on self-discipline alone tends to fall apart within the first week — which is exactly the situation the source report's "what not to copy" section warns about when it says "do the zero-cost things first, then touch the gates": if a rule isn't enforced from day one, the team quickly learns to route around it instead of forming the habit. There's also a wish to preserve the full intent of DSH's original mechanism, including "translations are part of what gets frozen," rather than simplifying it away for convenience.

## Alternatives Considered

- **Keep running without a script for a while longer before deciding** — the report's suggested order is "zero-cost first, then gates," but that advice assumes a team that already has some self-discipline; for a convention just starting out with only one or two people maintaining it, "no enforcement" tends to mean "unmaintained very soon," so the benefit doesn't necessarily hold here.
- **Add the script but skip bilingual** — the bilingual triple carries no format risk on its own, and adding it doesn't complicate the script; but the requester explicitly asked to keep it, meaning bilingual is treated as part of the mechanism's completeness, not an optional extra.
- **Require bilingual starting at the `proposed` stage** — would raise the bar for jotting down a rough idea; staying single-language during exploration, and requiring both languages only once a record is settled enough to move to `implemented`, keeps early drafting light.

## Why

Enforcement is cheap (a script of a few dozen lines plus a git hook) but immediately prevents the documentation from drifting starting on day one; the bilingual requirement doubles the writing cost of every implemented/archived record, but it was explicitly judged worth keeping as part of the mechanism's completeness rather than something to cut for convenience. Keeping `proposed` single-language avoids making "jotting down an idea that isn't settled yet" too heavy a step.
