import z from "@deepseek-ai/schemastery";
/**
 * Plugin configuration surface.
 *
 * Cordis plugins declare their configurable surface as a schemastery schema
 * (exported as `Config` from the plugin root). The cordis loader validates and
 * defaults it before calling apply(ctx, config); deployment overrides land in
 * the user patch layer, never in the bundle patch (see deploy/cordis.patch.yml).
 */
export interface PluginConfig {
    defaultGreeting: string;
}
export declare const Config: z<PluginConfig>;
//# sourceMappingURL=plugin-config.d.ts.map