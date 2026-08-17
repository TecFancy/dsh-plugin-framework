/**
 * Structural type contracts for the client half.
 *
 * These are plain structural mirrors of the dsh client services the plugin
 * touches. The client bundle is built as a single externalized file whose only
 * externals are react / react/jsx-runtime, so this file must NEVER import any
 * @deepseek-ai/* runtime value: everything here is a shape, and the real
 * objects are injected by the dsh web host at runtime.
 */
export interface SlotRegisterOptions {
  name: string;
  id: string;
  order?: number;
  label: () => string;
}

export interface SlotsService {
  inject(slotName: string, register: () => void): void;
  register(options: SlotRegisterOptions, view: () => unknown): unknown;
}

/** The `host` builtin: package-private JSON RPC to the plugin's host half. */
export interface HostBridge {
  call<T = unknown>(method: string, args?: unknown): Promise<T>;
}

/** The cordis client context shape this plugin relies on. */
export interface HelloClientContext {
  slots: SlotsService;
}
