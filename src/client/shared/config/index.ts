/**
 * Client shared config segment barrel. Import types through this barrel, never
 * directly from ./context.ts outside this segment.
 */
export type {
  HelloClientContext,
  HostBridge,
  SlotRegisterOptions,
  SlotsService,
} from "./context.ts";
