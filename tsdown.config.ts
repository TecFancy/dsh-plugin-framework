import type { UserConfig } from "tsdown";

/**
 * dsh-plugin-framework client half build: src/client/index.tsx -> lib/client.js
 * (window.__ModuleLoader__.load({ id, factory }) format, CJS closure).
 *
 * Mirrors the verified dsh-client bundle preset used by dsh-auth-gate:
 * - react / react/jsx-runtime are externalized against the web app's module
 *   table; everything else is inlined;
 * - CSS Modules are extracted to lib/style.css by tsdown and then embedded
 *   into client.js via the `styles` builtin by
 *   scripts/normalize-client-bundle.mjs (the loader fetches ONLY the factory
 *   script, so a separate stylesheet would be dead);
 * - the plugin imports no @deepseek-ai/* runtime values on the client (type
 *   contracts are structural mirrors), so no purity gate is needed;
 * - single-file output (codeSplitting: false). The CJS closure format is
 *   REQUIRED by the dsh client-modules loader contract, so the "prefer ESM"
 *   tsdown warning is expected and must stay.
 */
const CLIENT_EXTERNALS = ["react", "react/jsx-runtime"];

export default [
  {
    entry: { client: "src/client/index.tsx" },
    outDir: "lib",
    format: "cjs",
    platform: "browser",
    dts: false,
    sourcemap: true,
    clean: false,
    deps: {
      neverBundle: CLIENT_EXTERNALS,
      alwaysBundle: (id: string) => !CLIENT_EXTERNALS.includes(id),
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify(process.env["NODE_ENV"] ?? "production"),
    },
    outputOptions: {
      entryFileNames: "client.js",
      banner: `window.__ModuleLoader__.load({ id: "dsh-plugin-framework", factory: (require) => {`,
      footer: "return module.exports; } });",
      intro: "var module = { exports: {} }; var exports = module.exports;",
      codeSplitting: false,
    },
  },
] satisfies UserConfig[];
