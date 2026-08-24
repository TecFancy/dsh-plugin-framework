#!/usr/bin/env node
/**
 * Emit the Typert Remote artifacts for this out-of-tree plugin.
 *
 * The official generator (@deepseek-ai/dsh-typert-generator) only discovers
 * contributors inside a monorepo: its analyzer walks the project references of
 * tsconfig.host.json / tsconfig.client.json and requires referenced packages
 * under <root>/packages (packages/typert/generator/src/analyzer.ts,
 * loadRegistrations). A standalone plugin repo therefore emits the same
 * artifact format itself, from the one source of truth that cannot drift: the
 * source file the endpoints are declared in.
 *
 * This script reads src/features/hello-settings/api/remote.ts, extracts every
 * @Remote endpoint with its exact source location, verifies the endpoint set
 * against the contract table below, and writes:
 *
 *   lib/typert.host.js            (TYPERT manifest, consumed by dsh-typert-loader)
 *   lib/typert.host.d.ts
 *   lib/typert.remote-client.js   (TYPERT_REMOTE contribution, consumed by the client bundle)
 *   lib/typert.remote-client.d.ts
 *
 * The output format mirrors @deepseek-ai/dsh-typert-generator's emitter so the
 * runtime surface (typert-loader, api-gateway) validates it identically. When
 * the plugin is moved into a monorepo, replace this script with the official
 * typertPlugin({ mode: "package" }) and delete the hand-written contract below.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const libDir = resolve(repoRoot, "lib");
const remoteSourcePath = resolve(repoRoot, "src", "features", "hello-settings", "api", "remote.ts");

const PACKAGE = "dsh-plugin-framework";
const SERVICE = "greeting";

/**
 * The plugin's Remote contract: namespace, method, wire parameter, and the
 * source location is pinned by the extractor inside this script, so a rename
 * in remote.ts without a matching update here fails the build instead of
 * shipping a stale descriptor.
 */
const CONTRACT = {
  namespace: SERVICE,
  service: SERVICE,
  getGreeting: { method: "getGreeting", parameters: [] },
  setGreeting: {
    method: "setGreeting",
    parameters: [{ name: "value", wire: "value", source: "json" }],
  },
};

/** @returns {{ name: string, loc: { line: number, column: number } }[]} found @Remote endpoints. */
function extractEndpoints(source) {
  const pattern =
    /@Remote\(\s*(["'])([A-Za-z0-9_$.-]+)\1\s*\)\s*\n\s*(?:public\s+|private\s+|protected\s+)?([A-Za-z_$][\w$]*)\s*\(/g;
  const found = [];
  for (const match of source.matchAll(pattern)) {
    const index = match.index;
    const prefix = source.slice(0, index);
    const line = prefix.split("\n").length;
    const lastNewline = prefix.lastIndexOf("\n");
    const column = index - lastNewline;
    found.push({ name: match[2], method: match[3], loc: { line, column } });
  }
  return found;
}

if (!existsSync(remoteSourcePath)) {
  throw new Error(`generate-typert: ${remoteSourcePath} is missing`);
}

const source = readFileSync(remoteSourcePath, "utf8");
const endpoints = extractEndpoints(source);

const expectedMethods = new Set([CONTRACT.getGreeting.method, CONTRACT.setGreeting.method]);
for (const endpoint of endpoints) {
  if (!expectedMethods.has(endpoint.name)) {
    throw new Error(
      `generate-typert: @Remote(${JSON.stringify(endpoint.name)}) is not declared in the contract table`,
    );
  }
}
if (endpoints.length !== expectedMethods.size) {
  const found = endpoints
    .map((endpoint) => endpoint.name)
    .sort()
    .join(", ");
  throw new Error(
    `generate-typert: expected ${expectedMethods.size} @Remote endpoints (${[...expectedMethods].sort().join(", ")}), found ${endpoints.length} (${found})`,
  );
}

const RESULT = {
  mode: "strict",
  typeSymbol: "dsh-plugin-framework/types#GreetingValue",
  schema: "z.string()",
};

function parameterDescriptor(parameter) {
  return {
    name: parameter.name,
    wire: parameter.wire,
    source: parameter.source,
    codec: { ...RESULT },
  };
}

function invocationFor(contract, endpoint) {
  return {
    id: `${PACKAGE}#${SERVICE}/${endpoint.name}`,
    service: SERVICE,
    namespace: SERVICE,
    method: endpoint.name,
    invocation: { kind: "direct" },
    parameters: contract.parameters.map(parameterDescriptor),
    result: { ...RESULT },
    sourceLocation: {
      file: "src/features/hello-settings/api/remote.ts",
      line: endpoint.loc.line,
      column: endpoint.loc.column,
    },
  };
}

const invocations = [
  invocationFor(
    CONTRACT.getGreeting,
    endpoints.find((e) => e.name === "getGreeting"),
  ),
  invocationFor(
    CONTRACT.setGreeting,
    endpoints.find((e) => e.name === "setGreeting"),
  ),
];
const MANIFEST = {
  package: PACKAGE,
  face: "host",
  schemas: [],
  invocations,
  model: { services: [], events: [], objects: [] },
};

const contribution = {
  package: PACKAGE,
  descriptors: invocations.map((invocation) => ({ ...invocation })),
};

// Serialize the JavaScript objects: codec schemas are zod calls inside the
// descriptor, so the emitted literal spells z.string() where the model holds
// the schema source string.
function serializeDescriptor(value) {
  return JSON.stringify(value, null, 2).replaceAll(
    `"schema": "z.string()"`,
    `"schema": z.string()`,
  );
}

const hostJs = `/* Generated by scripts/generate-typert.mjs in the emission format of
 * @deepseek-ai/dsh-typert-generator -- do not edit. See docs/decisions.md D11. */
import { z } from "zod";

export const TYPERT = ${serializeDescriptor(MANIFEST)};
`;

const remoteClientJs = `/* Generated by scripts/generate-typert.mjs from the host Remote contract
 * (same format as @deepseek-ai/dsh-typert-generator) -- do not edit.
 * See docs/decisions.md D11. */
import { z } from "zod";

const TYPERT_REMOTE = ${serializeDescriptor(contribution)};

export { TYPERT_REMOTE };
export default TYPERT_REMOTE;
`;

const hostDts = `/* Generated by scripts/generate-typert.mjs -- do not edit. */

export declare const TYPERT: unknown;
`;

const interfaceName = `TypertRemoteNamespace$${Buffer.from(SERVICE, "utf8").toString("hex")}`;
const methodSignatures = invocations
  .map((invocation) => {
    const params = invocation.parameters.map((parameter) => `${parameter.wire}: string`).join(", ");
    return `    ${invocation.method}: (${params}) => Promise<RemoteResult<string>>`;
  })
  .join("\n");
const mapEntries = invocations
  .map(
    (invocation) =>
      `    '${invocation.namespace}/${invocation.method}': (${invocation.parameters
        .map((parameter) => `${parameter.wire}: string`)
        .join(", ")}) => Promise<RemoteResult<string>>`,
  )
  .join("\n");

const remoteClientDts = `/* Generated by scripts/generate-typert.mjs in the emission format of
 * @deepseek-ai/dsh-typert-generator -- do not edit. See docs/decisions.md D11. */
import type {
  RemoteResult,
  TypertRemoteContribution,
} from "@deepseek-ai/dsh-typert-protocol";

declare module "@deepseek-ai/dsh-typert-protocol" {
  interface ${interfaceName} {
${methodSignatures}
  }
  interface TypertRemoteMap {
${mapEntries}
  }
  interface TypertRemoteNamespaceMap {
    "${SERVICE}": ${interfaceName}
  }
}

export declare const TYPERT_REMOTE: TypertRemoteContribution;
export default TYPERT_REMOTE;
`;

mkdirSync(libDir, { recursive: true });
const outputs = {
  "typert.host.js": hostJs,
  "typert.host.d.ts": hostDts,
  "typert.remote-client.js": remoteClientJs,
  "typert.remote-client.d.ts": remoteClientDts,
};
for (const [file, content] of Object.entries(outputs)) {
  writeFileSync(resolve(libDir, file), content);
  console.log(`generate-typert: wrote lib/${file}`);
}

// Assert the emitted descriptors stay consistent with the source markers: the
// two endpoints must round-trip, so a renamed method never ships silently.
const roundTrip = extractEndpoints(readFileSync(remoteSourcePath, "utf8"));
for (const invocation of invocations) {
  const marker = roundTrip.find((entry) => entry.name === invocation.method);
  if (marker === undefined) {
    throw new Error(
      `generate-typert: emitted invocation ${JSON.stringify(invocation.method)} has no @Remote marker`,
    );
  }
}
