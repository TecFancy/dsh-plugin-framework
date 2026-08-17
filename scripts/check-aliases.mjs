#!/usr/bin/env node
/**
 * Validates that tsconfig.client.json's compilerOptions.paths mirrors
 * aliases.json exactly (client-side aliases only).
 *
 * Design note: the HOST side intentionally does NOT use path aliases. Host
 * code is emitted by tsc as Node ESM, and tsc does not rewrite path-mapped
 * specifiers at emit time, so an alias import would break at runtime unless it
 * carries an explicit .js suffix on every use. Relative imports with .js
 * suffixes are short at plugin depth and always runtime-correct. The client
 * side is bundled by tsdown with Bundler resolution, where aliases are safe,
 * so aliases.json only covers client/ keys. See docs/decisions.md.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import stripJsonComments from "strip-json-comments";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function readJson(relativePath) {
  return JSON.parse(stripJsonComments(readFileSync(resolve(repoRoot, relativePath), "utf8")));
}

const aliases = readJson("aliases.json");
const clientTsconfig = readJson("tsconfig.client.json");

const declaredPaths = clientTsconfig.compilerOptions?.paths ?? {};
const clientKeys = Object.keys(aliases).filter((key) => key.startsWith("client/"));

// tsconfig path keys carry the "/*" pattern suffix; normalize for comparison
// with the bare alias names.
const declared = Object.fromEntries(
  Object.entries(declaredPaths).map(([key, value]) => [key.replace(/\/\*$/, ""), value]),
);

const missing = clientKeys.filter((key) => !(key in declared));
const extra = Object.keys(declared).filter((key) => !clientKeys.includes(key));
const mismatched = clientKeys.filter((key) => {
  const expected = ["./" + aliases[key].replace(/^\.?\//, "") + "/*"];
  const actual = declared[key];
  return !Array.isArray(actual) || JSON.stringify(actual) !== JSON.stringify(expected);
});

if (missing.length === 0 && extra.length === 0 && mismatched.length === 0) {
  console.log("OK: tsconfig.client.json paths mirror aliases.json");
  process.exit(0);
}

console.error("FAIL: alias drift detected between aliases.json and tsconfig.client.json");
if (missing.length > 0) console.error("  missing in tsconfig.client.json:", missing.join(", "));
if (extra.length > 0)
  console.error("  extra in tsconfig.client.json (non-client keys):", extra.join(", "));
for (const key of mismatched) {
  console.error(`  mismatch for "${key}": expected ${JSON.stringify("./" + aliases[key] + "/*")}`);
}
process.exit(1);
