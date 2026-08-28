# Write the rules that must be kept as gate scripts (M2)

## Decision

Land M2 of the restraint-engineering report ("rules that must be kept are written as gate scripts, not as suggestions") in this repository:

1. Add `scripts/verify-slice-boundaries.mjs`: imports across slices may only land on the target slice's `index.ts`/`index.tsx` barrel; same-layer slices may never import each other, even through barrels; the assembly roots (`src/index.ts`, `src/client/index.tsx`) may only enter slices through barrels; imports that cannot be resolved fail (fail-closed). Exposed as `npm run slice:check`, wired into the `verify` chain, lint-staged (`src/**`) and CI. The 3 existing deep imports from the roots (`features/hello-settings/api/*`, `shared/config/plugin-config`) were rewritten to go through their barrels.
2. Add a `subject-english` commitlint rule (registered through a plugin): the subject must be pure ASCII (English); non-ASCII subjects are rejected, never silently rewritten.
3. Extend the AI-author trailer strip in `.husky/commit-msg` from `Claude|Copilot` to 13 common AI tools, keeping the "auto-strip on commit" strategy (a transformative gate); human co-authors are unaffected.
4. Add a Gate coverage map to AGENTS.md: every convention either names its machine gate or is explicitly listed under "relies on humans" — no silent suggestions remain.

## Context

An audit of this repository against the restraint-engineering report found three places where a rule is written in AGENTS.md but has no gate behind it: the barrel-only import-surface rule had no check at all, and the current code itself violated it in 3 places (the assembly roots bypassed slice barrels); `subject-case` is explicitly disabled in commitlint, so the English-subject rule relies entirely on discipline; the AI-trailer strip only covered Claude and Copilot. Also, ESLint's no-restricted-paths can only express layer direction, not slice-level structure such as "same-layer slices never import each other" or "only the barrel is importable". Section 08 of the report also requires "write down where gates do not cover" — so the gate map itself is part of this delivery.

## Alternatives Considered

- **Express slice boundaries with ESLint zones** — zones match on path prefixes and can block some deep imports, but "only index.ts" and "no same-layer slice imports" would require enumerating many zones per slice, and interactions with the resolver/aliases are easy to miss; insufficient expressive power, high maintenance cost.
- **A strict parser using the TS compiler API / ts-morph** — precise but heavy dependency and a long script; this repository's import shapes (relative paths, `.js`/`.ts`/`.tsx` suffixes, `client/*` aliases, css modules) are fully covered by "regex extraction + filesystem resolution" without compiler-level precision.
- **Reject AI trailers hard in commitlint instead of stripping** — theoretically more fail-closed, but legitimate human co-authors cannot be distinguished automatically, so a hard reject would hurt real collaboration; the auto-strip achieves the same outcome for history (always clean) with zero friction.
- **No gate, keep relying on discipline** — directly contradicts the M1 principle "a rule either blocks people or should not be written"; rejected.

## Why

"Regex + filesystem resolution" is the lightest implementation that covers the current import shapes, and fail-closed behavior (unresolvable imports fail) guarantees the gate never silently passes an unknown shape; anchoring a slice at its nearest barrel directory naturally turns "every slice must have a barrel" into a checkable invariant as well. Registering custom commitlint rules through a plugin is the official mechanism and keeps the change minimal. Auto-stripping instead of hard-rejecting is chosen because both produce the same effect on history while stripping has zero friction. The Gate coverage map turns "which rules no machine watches" into an explicit list — the direct landing of report §08, avoiding the pretense of full automation.
