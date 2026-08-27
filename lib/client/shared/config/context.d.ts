/**
 * Structural type contracts for the client half.
 *
 * These are plain structural mirrors of the dsh client services the plugin
 * touches. The client bundle is built as a single externalized file whose only
 * externals are react / react/jsx-runtime, so this file must NEVER import any
 * @deepseek-ai/* runtime value: everything here is a shape, and the real
 * objects are injected by the dsh web host at runtime. The precise
 * declarations produced by the generated /remote artifact
 * (lib/typert.remote-client.d.ts) augment the real protocol types; this mirror
 * keeps the bundle free of any @deepseek-ai value import.
 */
export interface SlotRegisterOptions {
    name: string;
    id: string;
    order?: number;
    label: string | (() => string);
}
export interface SlotsService {
    inject(slotName: string, register: () => void): void;
    register(options: SlotRegisterOptions, view: () => unknown): unknown;
}
/** Result envelope of a Typert Remote invocation (mirror of RemoteResult<T>). */
export type RemoteResult<T> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
    };
};
/** The greeting namespace callable handle mounted from this plugin's /remote contribution. */
export interface GreetingRemoteHandle {
    getGreeting(): Promise<RemoteResult<string>>;
    setGreeting(value: string): Promise<RemoteResult<string>>;
}
/** The generated client contribution (mirror of TypertRemoteContribution). */
export interface RemoteContribution {
    package: string;
    descriptors: readonly unknown[];
}
/** The client `remote` service face this plugin consumes (mirror of the api-gateway client service). */
export interface RemoteService {
    $mount(contribution: RemoteContribution): Promise<() => Promise<void>>;
    greeting: GreetingRemoteHandle;
}
/** The cordis client context shape this plugin relies on. */
export interface HelloClientContext {
    slots: SlotsService;
    remote: RemoteService;
}
//# sourceMappingURL=context.d.ts.map