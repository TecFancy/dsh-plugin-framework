# Assemble gates by scenario; locally run only the minimal evidence set (M3)

## Decision

Land M3 of the restraint-engineering report ("CI is not 'run everything in one go' — it is a gate graph assembled per scenario") in this repository, as a lightweight version sized to the repo (not a copy of DSH's 968-line scheduler):

1. Add `scripts/run-gates.mjs`: the same 11 gates are organized into 5 named scenarios (`hygiene` / `types` / `tests` / `build` / `verify` = full set), exposed as `npm run gates`.
2. Auto-detection: run with no arguments, it scans the change surface (`git diff --name-only <base>`, default `HEAD`) and unions the minimal evidence set from an explicit "changed file shape → scenario" rule table; **fail-closed** — dependency changes, unknown file shapes, and non-git environments fall back to the full set, never to a weaker one. `--scenario <name>` forces a scenario, `--list` prints the scenario table.
3. `.husky/pre-push` changes from "only type-check" to `npm run gates -- --base @{u}`: one invocation covers both unpushed commits and uncommitted changes, so the minimal evidence set for the push surface always runs.
4. CI splits the monolithic single-job `verify` (11 sequential steps) into three narrow, parallel jobs (`hygiene` / `quality` / `build`), each running its own full subset on the dual-OS matrix; **no path filters** — those would silently skip jobs, and a full run is only a few tens of seconds.
5. `npm run verify` stays unchanged as the authoritative full gate (CI and release); AGENTS.md now marks it "full set - CI and release; not every local run".

## Context

The status quo was "run everything with one command": a one-line doc change paid for type-check + coverage + build (30+ seconds locally), while pre-push ran only type-check — src changes could be pushed without lint or slice checks. Both over-cost and under-coverage existed at once. The report's M3 wording is blunt: **do not run the full set by default before commit or push; pick the minimal evidence set covering the change surface; full coverage is CI's job**, and the mapping table calls for "a clear local pre-push minimal set vs. a CI full set; the local machine never runs the full set".

## Alternatives Considered

- **Copy DSH's `run-gates.ts` (968 lines, 15 scenarios, concurrency caps)** — DSH's scheduler exists to stop four parallel tsc compiles from drowning a dev machine; with 11 gates and a single package that problem does not exist here, and the complexity is pure burden.
- **Make pre-push run `npm run verify`** — coverage is fixed, but it violates "no full set locally": every push costs 30+ seconds, and people learn to price it and route around it (`--no-verify`, fewer pushes).
- **Only split CI workflows with path filters, leave local alone** — local experience and pre-push coverage stay broken; half a landing.
- **Auto-detection + named scenarios (chosen)** — minimal set by default locally, `--scenario` as a manual escape hatch, and full-set fallback as the floor.

## Why

The detection rules are an explicit table: each file shape maps to scenarios, the union runs, and shapes the table does not know (new file kinds, dependency changes) fall back to the full set — automation is only acceptable if it may run less but never _check_ less. Pre-push uses `@{u}` as the base to cover unpushed commits and uncommitted changes in one shot, falling back to `HEAD` when no upstream exists. CI splits into three jobs for parallelism and failure locality, deliberately without path filters: full coverage costs only a few tens of seconds here, and skipping jobs would trade that for silent partial coverage. `verify` remains the authoritative full set, `gates` is the daily path — the two serve different jobs.
