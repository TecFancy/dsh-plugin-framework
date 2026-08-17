#!/usr/bin/env node
/**
 * Normalizes the tsdown client bundle for the dsh loader contract.
 *
 * tsdown extracts CSS Modules into a sibling lib/style.css. The dsh
 * client-modules loader loads ONLY the single factory script, so that
 * stylesheet would never be fetched and the UI would ship unstyled. This
 * script:
 *
 * 1. embeds the extracted CSS into the factory body through the runner-injected
 *    `styles` builtin (styles.insert(css) - documented in the official
 *    cordis-plugin-development skill and the cordis client runner's builtin
 *    list; the stylesheet is cleaned up automatically when the client run
 *    ends);
 * 2. defensively strips a stray `import './style.css'` line that some tsdown
 *    css configurations prepend (invalid inside the CJS factory);
 * 3. removes the now-dead style.css artifact so the output is strictly the
 *    single file contract.
 *
 * When the client bundle contains NO css (e.g. a plugin whose example slices
 * were stripped before the first build), no style.css is produced and this
 * script skips the embed with a notice instead of crashing.
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const libDir = resolve(repoRoot, "lib");
const bundlePath = resolve(libDir, "client.js");
const cssPath = resolve(libDir, "style.css");

const ANCHOR = "var exports = module.exports;";
const ID = "dsh-plugin-framework";

if (!existsSync(bundlePath)) {
  throw new Error("normalize: lib/client.js missing (run tsdown before this script)");
}

let bundle = readFileSync(bundlePath, "utf8");

const anchorIndex = bundle.indexOf(ANCHOR);
if (anchorIndex < 0) throw new Error(`normalize: anchor "${ANCHOR}" not found in lib/client.js`);

if (!existsSync(cssPath)) {
  // No extracted stylesheet: nothing to embed. Still normalize the bundle so
  // the footer/single-file contract holds (e.g. strip stray css imports).
  bundle = bundle.replace(/^import\s+['"][^'"]+\.css['"];\n/gm, "");
  writeFileSync(bundlePath, bundle, "utf8");
  console.log("normalize: no style.css extracted (no CSS Modules in this build); bundle unchanged");
  process.exit(0);
}

const css = readFileSync(cssPath, "utf8");

// 1. Embed the stylesheet through the runner-injected styles builtin.
const cssLiteral = JSON.stringify(css);
const injection = [
  "",
  "// styles injected by scripts/normalize-client-bundle.mjs",
  `if (typeof styles !== "undefined") {`,
  `  try { styles.insert(${cssLiteral}); } catch (__err) {`,
  `    console.error("[${ID}] styles.insert failed", __err);`,
  "  }",
  "}",
  "",
].join("\n");

const insertAt = anchorIndex + ANCHOR.length;
bundle = bundle.slice(0, insertAt) + injection + bundle.slice(insertAt);

// 2. Defensive: drop a stray CSS import line some tsdown css configs prepend.
bundle = bundle.replace(/^import\s+['"][^'"]+\.css['"];\n/gm, "");

// 3. Remove the now-dead stylesheet artifact.
rmSync(cssPath, { force: true });

writeFileSync(bundlePath, bundle, "utf8");
console.log(`normalized ${css.length} bytes of CSS into lib/client.js (style.css removed)`);
