/**
 * Ambient declaration for the runner-injected `harness` builtin on the dsh
 * host plane. The value is provided at runtime by the dsh cordis host runner
 * (see the official cordis-plugin-development skill: "Host registers a
 * Package-private method with harness.handle(method, handler)"). This
 * declaration only makes the symbol type-safe; runtime access must be guarded
 * with `typeof harness === "undefined"` (see features/hello-settings/api/bridge.ts).
 */
declare const harness: {
  handle(method: string, handler: (args?: unknown) => unknown): () => void;
};
