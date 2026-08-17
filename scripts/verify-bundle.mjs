#!/usr/bin/env node
/**
 * Verifies the tsdown client bundle produced by `npm run build`:
 *
 * 1. lib/client.js exists and is a single file (no code splitting);
 * 2. it opens with the window.__ModuleLoader__.load banner and closes with the
 *    factory footer;
 * 3. the module loader load call appears exactly once at the top level;
 * 4. the bundle is a non-trivial size (rules out empty builds).
 *
 * Heuristic by design: the bundle is a CJS closure, so a full static analysis
 * of its externals is not practical here. The important invariants are the
 * loader contract and the single-file shape.
 */
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const bundlePath = resolve(repoRoot, "lib", "client.js");

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

check(exists(bundlePath), `lib/client.js missing (run npm run build first)`);
check(
  !exists(resolve(repoRoot, "lib", "style.css")),
  "lib/style.css must not ship: the single-file contract only loads client.js (normalize-client-bundle.mjs should have inlined it)",
);
if (exists(bundlePath)) {
  const stats = statSync(bundlePath);
  check(stats.size > 1024, `lib/client.js looks empty (${stats.size} bytes)`);

  const content = readFileSync(bundlePath, "utf8");
  const fullLength = (content.match(/window\.__ModuleLoader__\.load/g) ?? []).length;
  check(
    fullLength === 1,
    `expected exactly one window.__ModuleLoader__.load call, found ${fullLength}`,
  );

  const trimmed = content.trimStart();
  check(
    trimmed.startsWith("window.__ModuleLoader__.load({"),
    "bundle must open with the module loader banner (tsdown banner misconfigured?)",
  );
  // tsdown may pretty-print the footer across multiple lines, so match the
  // factory tail tolerantly (after dropping the source map pointer comment).
  const tail = content.replace(/\n?\/\/# sourceMappingURL=[^\n]*$/, "").trimEnd();
  check(
    /return module\.exports;\s*\}\s*\}\);\s*$/.test(tail),
    "bundle must close with the CJS factory footer (tsdown footer misconfigured?)",
  );
  check(
    content.includes('id: "dsh-plugin-framework"'),
    'bundle id mismatch: expected id: "dsh-plugin-framework"',
  );
  check(
    !content.includes("codeSplitting"),
    "bundle must be a single file (codeSplitting must be disabled in tsdown.config.ts)",
  );
}

if (failures.length > 0) {
  console.error("bundle:check FAILED");
  for (const failure of failures) console.error("  - " + failure);
  process.exit(1);
}

console.log(
  `OK: lib/client.js verified (${(statSync(bundlePath).size / 1024).toFixed(1)} KiB, single file, loader contract intact)`,
);

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}
