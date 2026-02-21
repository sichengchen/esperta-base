import { Type } from "@mariozechner/pi-ai";
import type { ToolImpl } from "../agent/types.js";
import type { ConfigManager } from "../config/index.js";

/** Create a set_api_key tool bound to a ConfigManager instance */
export function createSetApiKeyTool(config: ConfigManager): ToolImpl {
  return {
    name: "set_api_key",
    description:
      "Store an API key securely in SA's encrypted secrets vault (secrets.enc). " +
      "The key becomes available immediately and persists across engine restarts.",
    summary:
      "Store an API key in SA's encrypted vault. Use for tool keys (BRAVE_API_KEY, PERPLEXITY_API_KEY) " +
      "and provider keys (ANTHROPIC_API_KEY, OPENAI_API_KEY, etc.). Keys take effect immediately.",
    parameters: Type.Object({
      name: Type.String({
        description:
          'Environment variable name for the key, e.g. "BRAVE_API_KEY", "OPENAI_API_KEY"',
      }),
      value: Type.String({ description: "The API key value" }),
    }),
    async execute(args) {
      const name = args.name as string;
      const value = args.value as string;

      if (!name.trim() || !value.trim()) {
        return { content: "Error: name and value must not be empty", isError: true };
      }

      try {
        const secrets = (await config.loadSecrets()) ?? { apiKeys: {} };
        secrets.apiKeys[name] = value;
        await config.saveSecrets(secrets);

        // Inject into current process so tools pick it up immediately
        process.env[name] = value;

        return {
          content: `Stored ${name} in encrypted secrets vault. The key is active now.`,
          isError: false,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: `Error storing key: ${msg}`, isError: true };
      }
    },
  };
}
