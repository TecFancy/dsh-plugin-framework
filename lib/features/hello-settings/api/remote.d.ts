import type { Context } from "@deepseek-ai/cordis";
import { TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import type { GreetingService } from "../../../entities/greeting/index.js";
/**
 * The package-private host Remote service: the Typert Gateway dispatches
 * `greeting/getGreeting` and `greeting/setGreeting` to this live Service, and
 * the generated artifacts in lib/ (scripts/generate-typert.mjs) describe the
 * same endpoints for the client bundle and the typert-loader.
 *
 * The `@Remote` markers set SRC-mode metadata; the strict wire contract lives
 * in the generated descriptors. Keep the two in sync: the generator script
 * fails the build when this class carries an endpoint it does not declare.
 */
export declare class GreetingRemote extends TypertRemoteService {
    #private;
    constructor(ctx: Context, greeting: GreetingService);
    getGreeting(): string;
    setGreeting(value: string): string;
}
//# sourceMappingURL=remote.d.ts.map