import z from "@deepseek-ai/schemastery";
export const Config = z.object({
    defaultGreeting: z.string().default("Hello from dsh-plugin-framework"),
});
//# sourceMappingURL=plugin-config.js.map