# Land decision records as a three-state directory, skip the bilingual triple and the format-check script for now

## Decision

Use `docs/decisions/{proposed|implemented|archived}/` to encode a decision record's state in this repo, with state changes done by moving the file; skip DSH's original Chinese/English bilingual triple structure, and skip writing a format-verification script for now. Archiving is judged by a human reading the record and asking whether the future still needs it to make a decision, not by word count or age.

## Context

[restraint-engineering-report.md](../../restraint-engineering-report.md)'s M1 section describes the DSH repository's decision-record mechanism: state encoded in the path, archived records frozen wholesale, and archiving judged by calibrated human judgment rather than an automated rule. The report's RSP mapping table suggests starting with a lightweight version, and this repo is currently empty, with no existing PR process or team scale that would justify a full mechanism with a format-check script from day one.

## Alternatives Considered

- **Copy DSH's bilingual triple structure as-is** — unnecessary for a single-person / small-scope pilot; the maintenance cost of two languages doesn't match the current scale.
- **Write the format-check script before starting to use the convention** — the report itself says, in its "what not to copy" section, "do the zero-cost things first, then touch the gates"; a script designed without real usage samples is likely to encode the wrong rules.
- **Skip the three folders and just tag the state as a field inside the file** — a field can be quietly changed without leaving a trace; a path move is harder to route around, and it matches M1's own design intent more closely.

## Why

A three-state directory has zero tooling cost and can be used today; leaving the archiving judgment to a human avoids the risk the report calls out in its "what not to copy" section — an automated word-count/age-based archiving rule will cut records that are actually still valuable. Once this convention has been used consistently for a few weeks, revisit whether a format-check script is worth adding (the report's stage three).

## Update (2026-08-28)

The "skip bilingual, skip the script for now" parts of this decision were superseded by [2026-08-28-add-format-gate-and-bilingual](./2026-08-28-add-format-gate-and-bilingual.en.md): before the habit is formed, a mechanical constraint is needed more, and the bilingual triple was decided to be worth keeping rather than simplifying away. The choice of a three-state directory itself stands.
