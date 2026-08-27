import { defineTool } from "@deepseek-ai/dsh-tools";
/**
 * Registers the example model-facing tool on the dsh tool runtime.
 *
 * @param tools - the tool runtime service (ctx.tools on a real context; a
 *   stub in unit tests). Only the register surface is needed here, which keeps
 *   the feature slice decoupled from full cordis contexts.
 * @param greeting - the greeting entity this tool reads.
 * @returns the disposer that unregisters the tool.
 */
export function registerHelloTool(tools, greeting) {
    return tools.register(defineTool({
        name: "hello_world_greet",
        description: "Return the plugin's current greeting message, editable from the dsh settings page (settings > Hello Framework).",
        parameters: {},
        output: {
            schema: {
                type: "object",
                properties: {
                    text: { type: "string" },
                },
                additionalProperties: true,
            },
            render: (_args, value) => [{ type: "text", text: value.text ?? "" }],
        },
        execute() {
            return Promise.resolve({ text: greeting.getGreeting() });
        },
    }));
}
//# sourceMappingURL=register-tool.js.map