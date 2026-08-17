#!/usr/bin/env node
/**
 * Scaffolds a new FSD slice on disk. Usage:
 *
 *   node scripts/create-slice.mjs --side host    --layer features --name my-feature [--model]
 *   node scripts/create-slice.mjs --side client  --layer features --name my-feature --ui
 *
 * Layers: features | entities | shared (shared slices get a segment argument
 * instead, e.g. --segment lib|ui|config, because shared is segmented).
 *
 * Generated code follows the framework conventions: kebab-case slice names,
 * a public-API barrel, and (for client features) a UI file plus CSS module.
 * New logic should live in an existing slice first; only extract a new slice
 * when a module is genuinely reused by 2+ consumers.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");

function usage() {
  console.error(
    "usage: node scripts/create-slice.mjs --side host|client --layer features|entities|shared --name <kebab-case> [--model] [--ui] [--segment lib|ui|config]",
  );
  process.exit(1);
}

function parseArgs(argv) {
  const args = {
    side: undefined,
    layer: undefined,
    name: undefined,
    model: false,
    ui: false,
    segment: undefined,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === "--side") {
      args.side = value;
      i += 1;
    } else if (key === "--layer") {
      args.layer = value;
      i += 1;
    } else if (key === "--name") {
      args.name = value;
      i += 1;
    } else if (key === "--segment") {
      args.segment = value;
      i += 1;
    } else if (key === "--model") {
      args.model = true;
    } else if (key === "--ui") {
      args.ui = true;
    } else usage();
  }
  if (!["host", "client"].includes(args.side)) usage();
  if (!["features", "entities", "shared"].includes(args.layer)) usage();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(args.name ?? "")) {
    console.error("slice name must be kebab-case (lowercase letters, digits, single hyphens)");
    process.exit(1);
  }
  if (args.layer === "shared" && !args.segment) usage();
  if (args.layer === "shared" && args.segment && !["lib", "ui", "config"].includes(args.segment))
    usage();
  return args;
}

const args = parseArgs(process.argv.slice(2));
const prefix = args.side === "host" ? "src" : "src/client";
const root = resolve(repoRoot, prefix);

let sliceDir;
if (args.layer === "shared") {
  sliceDir = join(root, "shared", args.segment, args.name);
} else {
  sliceDir = join(root, args.layer, args.name);
}

const files = [];
const barrel = [
  `/**`,
  ` * ${args.name} slice.`,
  ` *`,
  ` * Every slice exposes a public API barrel as its only legal import`,
  ` * surface for other slices; nothing outside may reach into internal files.`,
  ` */`,
];

if (args.layer === "features") {
  if (args.side === "host") {
    files.push([join(sliceDir, "api", `${args.name}.ts`), placeholder("api", args)]);
    files.push([join(sliceDir, "api", `${args.name}.test.ts`), testPlaceholder(args)]);
    barrel.push(`export { placeholder } from "./api/${args.name}.js";`);
  } else {
    if (args.ui) {
      const namePascal = pascalCase(args.name);
      files.push([join(sliceDir, "ui", `${namePascal}.tsx`), uiPlaceholder(namePascal, args)]);
      files.push([
        join(sliceDir, "ui", `${namePascal}.module.css`),
        "/* styles for the slice UI (CSS Modules, inlined into the client bundle) */\n",
      ]);
      files.push([join(sliceDir, "ui", `${namePascal}.test.tsx`), uiTestPlaceholder(namePascal)]);
      barrel.push(`export { ${namePascal} } from "./ui/${namePascal}.js";`);
    } else {
      files.push([join(sliceDir, "index.ts"), placeholder("api", args)]);
      barrel.push(`export { placeholder } from "./index.js";`);
    }
  }
} else if (args.layer === "entities") {
  files.push([join(sliceDir, "model", `${args.name}.ts`), placeholder("model", args)]);
  files.push([join(sliceDir, "model", `${args.name}.test.ts`), testPlaceholder(args)]);
  barrel.push(`export { placeholder } from "./model/${args.name}.js";`);
} else {
  // shared segment slice: a library/UI/config module with the shared/ subdir convention
  files.push([join(sliceDir, "index.ts"), placeholder("index", args)]);
  files.push([join(sliceDir, "index.test.ts"), testPlaceholder(args)]);
  barrel.push(`export { placeholder } from "./index.js";`);
}

const barrelText = barrel.join("\n") + "\n";
if (!files.some(([path]) => path.endsWith("index.ts"))) {
  files.push([join(sliceDir, "index.ts"), barrelText]);
} else {
  const idx = files.findIndex(([path]) => path.endsWith("index.ts"));
  files[idx][1] = barrelText;
}

for (const [path, content] of files) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  console.log("created", path.replace(repoRoot + "\\", ""));
}

function pascalCase(name) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

function placeholder(kind, a) {
  const what = a.name;
  return [
    `/**`,
    ` * TODO(${what}): implement this ${kind} placeholder for the ${a.layer} slice.`,
    ` */`,
    a.side === "client" && (a.layer === "shared" || a.ui)
      ? `export function placeholder(): null { return null; }`
      : `export function placeholder(): void { /* TODO(${what}) */ }`,
    "",
  ].join("\n");
}

function testPlaceholder(a) {
  return [
    `import { describe, expect, it } from "vitest";`,
    `import { placeholder } from "./${a.name}.js";`,
    ``,
    `describe("${a.name}", () => {`,
    `  it("placeholder behavior", () => {`,
    `    expect(() => placeholder()).not.toThrow();`,
    `  });`,
    `});`,
    "",
  ].join("\n");
}

function uiPlaceholder(name, a) {
  const hooks = a.model ? "useEffect, " : "";
  return [
    `import { ${hooks}useState } from "react";`,
    `import css from "./${name}.module.css";`,
    ``,
    `export interface ${name}Props {`,
    `  /** TODO(${a.name}) */`,
    `}`,
    ``,
    `export function ${name}(_props: ${name}Props): JSX.Element {`,
    `  const [state, setState] = useState<string>("");`,
    `  return (`,
    `    <div className={css.root}>`,
    `      <input`,
    `        data-testid="${a.name}-input"`,
    `        value={state}`,
    `        onChange={(event) => setState(event.target.value)}`,
    `      />`,
    `    </div>`,
    `  );`,
    `}`,
    "",
  ].join("\n");
}

function uiTestPlaceholder(name) {
  return [
    `// @vitest-environment jsdom`,
    `import { cleanup, render, screen } from "@testing-library/react";`,
    `import { afterEach, describe, expect, it } from "vitest";`,
    `import { ${name} } from "./${name}.js";`,
    ``,
    `describe("${name}", () => {`,
    `  afterEach(cleanup);`,
    `  it("renders without crashing", () => {`,
    `    render(<${name} />);`,
    `    expect(screen.getByTestId("${kebab(name)}-input")).toBeTruthy();`,
    `  });`,
    `});`,
    "",
  ].join("\n");
}

function kebab(value) {
  return value
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}
