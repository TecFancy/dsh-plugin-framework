/**
 * Ambient declaration for the runner-injected `host` builtin on the dsh client
 * plane: package-private JSON RPC from the client bundle to this package's
 * host half (`host.call(method, args?) -> Promise<JsonValue>`, see the
 * official cordis-plugin-development skill). Type safety comes from the
 * structural HostBridge contract in shared/config/context.ts.
 */
declare const host: import("./shared/config/index.ts").HostBridge;

/**
 * Ambient declaration for the runner-injected `styles` builtin on the dsh
 * client plane: package-owned stylesheet insertion, cleaned up automatically
 * when the client run ends (see the cordis client runner's builtin list).
 * scripts/normalize-client-bundle.mjs uses it to embed the extracted CSS
 * Modules stylesheet into the single-file bundle.
 */
declare const styles: {
  insert(css: string): () => void;
};
