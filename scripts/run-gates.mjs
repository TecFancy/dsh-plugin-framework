#!/usr/bin/env node
// Scenario gate runner (M3): named scenarios assembled from the same gates as
// `npm run verify`, plus automatic selection of the minimal evidence set for
// the change surface. Pre-push runs this via `.husky/pre-push`; full coverage
// is CI's job, not every local run's. Fail-closed: unknown change shapes or a
// broken git state fall back to the full set, never to a weaker one.

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const GATES = [
  "format:check",
  "lint",
  "lint:no-emdash",
  "slice:check",
  "aliases:check",
  "lock:check",
  "decisions:check",
  "type-check",
  "test:coverage",
  "build",
  "bundle:check",
];

const SCENARIOS = {
  hygiene: [
    "format:check",
    "lint",
    "lint:no-emdash",
    "slice:check",
    "aliases:check",
    "lock:check",
    "decisions:check",
  ],
  types: ["type-check"],
  tests: ["test:coverage"],
  build: ["build", "bundle:check"],
  verify: GATES,
};

// Change-surface rules: the first matching rule per changed file wins, and the
// union of the matched scenarios is what runs. `verify` is the fail-closed
// answer for shapes the map does not know (dependency changes, unknown files).
const RULES = [
  { re: /^src\//, scenes: ["hygiene", "types", "tests", "build"] },
  { re: /^lib\//, scenes: ["hygiene", "build"] }, // build artifacts
  {
    re: /^(scripts\/|.*\.config\.(js|mjs|ts)$|aliases\.json|tsconfig.*\.json$)/,
    scenes: ["hygiene", "types"],
  },
  {
    re: /^(package\.json|package-lock\.json|\.npmrc)$/,
    scenes: ["verify"], // dependency changes ripple everywhere
  },
  { re: /^(docs\/|AGENTS\.md|README\.md|.*\.md$)/, scenes: ["hygiene"] },
  { re: /^\./, scenes: ["hygiene"] }, // dotfiles: .github, .husky, ...
  { re: /.*/, scenes: ["verify"] }, // unknown -> full set
];

function expand(scenes) {
  const gates = [];
  for (const scene of scenes) {
    for (const gate of SCENARIOS[scene]) {
      if (!gates.includes(gate)) gates.push(gate);
    }
  }
  return gates;
}

function changedFiles(base) {
  let tracked = null;
  for (const candidate of [base, "HEAD"]) {
    const result = spawnSync("git", ["diff", "--name-only", candidate], {
      cwd: ROOT,
      encoding: "utf8",
    });
    if (result.status === 0) {
      tracked = result.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      break;
    }
  }
  if (tracked === null) return null; // not a git checkout
  // `git diff` never lists untracked files — a new src/ file would otherwise
  // skip type-check/tests entirely. Fold them in (status short format: "?? path").
  const status = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  const untracked =
    status.status === 0
      ? status.stdout
          .split("\n")
          .filter((line) => line.startsWith("?? "))
          .map((line) => line.slice(3))
          .filter(Boolean)
      : [];
  return [...new Set([...tracked, ...untracked])];
}

function runGates(gates) {
  for (const gate of gates) {
    console.log(`\n=== ${gate} ===`);
    const result = spawnSync("npm", ["run", gate], {
      cwd: ROOT,
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (result.status !== 0) {
      console.error(`\n✖ ${gate} failed — fix it and re-run.`);
      process.exit(result.status ?? 1);
    }
  }
}

const args = process.argv.slice(2);
let scenario = null;
let base = "HEAD";
if (args.includes("--list")) {
  console.log("Scenarios (named gate sets, same gates as `npm run verify`):\n");
  for (const [name, gates] of Object.entries(SCENARIOS)) {
    console.log(`  ${name.padEnd(8)} ${gates.join(", ")}`);
  }
  console.log("\nUsage: node scripts/run-gates.mjs [--scenario <name>] [--base <ref>]");
  console.log(
    "  default: auto-detect the change surface against HEAD (pre-push passes --base @{u})",
  );
  process.exit(0);
}
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--scenario") scenario = args[++i];
  else if (args[i] === "--base") base = args[++i];
  else {
    console.error(`Unknown argument: ${args[i]}`);
    process.exit(2);
  }
}

if (scenario) {
  if (!SCENARIOS[scenario]) {
    console.error(`Unknown scenario "${scenario}" — see --list.`);
    process.exit(2);
  }
  const gates = expand([scenario]);
  console.log(`Scenario ${scenario}: ${gates.length} gates\n`);
  runGates(gates);
  console.log(`\n✓ ${scenario} passed (${gates.length} gates).`);
  process.exit(0);
}

const files = changedFiles(base);
if (files === null) {
  console.error("Not a git checkout — pass --scenario <name> explicitly (see --list).");
  process.exit(2);
}
if (files.length === 0) {
  console.log("No changes since the base — running the hygiene scenario.");
  runGates(expand(["hygiene"]));
  console.log("\n✓ hygiene passed (no changes found).");
  process.exit(0);
}

const scenes = new Set();
for (const file of files) {
  const rule = RULES.find((r) => r.re.test(file));
  for (const scene of rule.scenes) scenes.add(scene);
}
const gates = expand([...scenes]);
const full = scenes.has("verify") || gates.length === GATES.length;
console.log(
  `Auto-detected ${files.length} changed file(s) → scenarios: ${[...scenes].join(", ")}` +
    (full ? " (full set)" : "") +
    "\n",
);
runGates(gates);
console.log(`\n✓ ${full ? "full set" : [...scenes].join(" + ")} passed (${gates.length} gates).`);
