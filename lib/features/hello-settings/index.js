/**
 * Example feature slice: "hello settings".
 *
 * A feature is a complete business capability with its own entry point. This
 * one owns the greeting domain flow end to end: the model-facing tool and the
 * host Remote service (GreetingRemote) the client UI calls. Pure algorithms
 * that multiple features would share belong in shared/, not here.
 */
export { GreetingRemote } from "./api/remote.js";
export { registerHelloTool } from "./api/register-tool.js";
//# sourceMappingURL=index.js.map