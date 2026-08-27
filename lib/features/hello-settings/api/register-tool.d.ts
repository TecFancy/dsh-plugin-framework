import type { ToolRuntime } from "@deepseek-ai/dsh-tools";
import type { GreetingService } from "../../../entities/greeting/index.js";
/**
 * Registers the example model-facing tool on the dsh tool runtime.
 *
 * @param tools - the tool runtime service (ctx.tools on a real context; a
 *   stub in unit tests). Only the register surface is needed here, which keeps
 *   the feature slice decoupled from full cordis contexts.
 * @param greeting - the greeting entity this tool reads.
 * @returns the disposer that unregisters the tool.
 */
export declare function registerHelloTool(tools: Pick<ToolRuntime, "register">, greeting: GreetingService): () => void;
//# sourceMappingURL=register-tool.d.ts.map