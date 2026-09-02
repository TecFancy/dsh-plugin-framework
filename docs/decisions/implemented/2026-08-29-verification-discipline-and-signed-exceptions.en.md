# Codify verification discipline and signed exceptions (A-tier restraint rules)

## Decision

Land the three "A-tier" rules from the restraint-engineering analysis (see
`docs/restraint-engineering-report.md`) as soft, review-enforced rules in
AGENTS.md and the plugin-development skill, without new mechanical gates:

1. Report only commands actually run; environment/permission blocks get an
   as-is retry before any code change (report N3/N4).
2. Tests describe behavior, not correctness; a deliberate behavior change
   updates its tests in the same change, with the reason in the PR (N5).
3. Every exception is signed in place: `eslint-disable`, coverage exemptions
   and skipped tests carry a reason; review checks that the reason stands
   (the "visible exception" meta-pattern).

## Context

The restraint report ranks these three as phase-one: zero-cost and
immediately behavior-changing for agents. The repo currently has zero
`eslint-disable` comments, zero skipped tests and zero TODO/FIXME markers in
`src/`, so mechanical gates would have no prey yet - and the report itself
notes that a gate which never blocks anyone might as well not exist. This repo
is a template: rules in AGENTS.md and the skill propagate to every downstream
plugin, so soft rules can land before the first real exception appears.
Multiple agents (Claude Code, dsh, Codex) work in this repo, and manual
verification (smoke-install into a real profile, browser UI, remote RPC)
sits outside every gate - exactly where hallucinated verification claims do
damage. The 70% coverage floor also creates a reverse incentive to weaken
assertions, which the template's tests would then pass on to downstream
plugins that copy them.

## Alternatives Considered

- **Immediate mechanical gates (coverage-exempt registry, eslint-disable
  reason linter)** - DSH's version of this; but with zero exceptions in the
  tree today the gate would block nobody, and the report warns that gates
  which never fire are ceremony. Deferred until the first real exception or
  downstream feedback appears.
- **Copy DSH's N1-N5 rules wholesale** - N1 (comment perspective leakage),
  N2 (defensive code inflation) and their tooling are real, but this repo is
  small and young; the three A-tier rules are the ones the report itself
  ranks first. The rest can follow when the repo grows or a real incident
  shows the need.
- **No action** - the tree is clean today, but "clean today" is exactly the
  moment to set behavior; the rules are what keep it clean when the first
  exception and the first real environment block arrive.
- **Soft rules in AGENTS.md + skill (chosen)** - zero cost, propagates
  through the template, and is enforced by review via the existing "Relies
  on humans" section and the skill's verification section.

## Why

These three rules are behavior-shaping, not gate-shaped: verification claims
live outside any gate, and assertion intent lives in PR discussion - neither
is mechanically enforceable. The chosen form follows the report's own phasing
("do the zero-cost items first, then gates") and its meta-pattern: soft rules
with mandatory in-place reasons beat hard rules that get routed around. The
template-propagation effect makes this point in the repo's life the cheapest
moment to set these norms.
