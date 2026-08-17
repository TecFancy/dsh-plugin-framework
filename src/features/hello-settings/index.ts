/**
 * Example feature slice: "hello settings".
 *
 * A feature is a complete business capability with its own entry point. This
 * one owns the greeting domain flow end to end: the model-facing tool and the
 * host half of the client bridge. Pure algorithms that multiple features would
 * share belong in shared/, not here.
 */
export { registerHelloBridge } from "./api/bridge.js";
export { registerHelloTool } from "./api/register-tool.js";
