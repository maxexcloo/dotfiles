import { execFileSync } from "node:child_process";
import { createProvider, getApiProvider } from "@earendil-works/pi-ai";

const baseUrl = "https://bifrost.excloo.com/v1";
const api = getApiProvider("openai-completions");

const key = () =>
  execFileSync("fnox", ["get", "BIFROST_PI_KEY"], { encoding: "utf8", stdio: "pipe" }).trim();

const label = (id) =>
  id
    .slice(id.lastIndexOf("/") + 1)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

// Bifrost lists the checkpoint Bento has loaded, so the picker always shows the
// real model name instead of a fixed alias.
export default function (pi) {
  if (!api) throw new Error("pi-ai has no openai-completions implementation");

  pi.registerProvider(
    createProvider({
      id: "bifrost",
      name: "Bifrost",
      baseUrl,
      api,
      auth: {
        apiKey: {
          name: "Bifrost virtual key",
          check: async () => ({ type: "api_key", source: "fnox" }),
          resolve: async () => ({ auth: { apiKey: key() }, source: "fnox" }),
        },
      },
      models: [],
      fetchModels: async (context) => {
        const response = await fetch(`${context.baseUrl ?? baseUrl}/models`, {
          headers: { authorization: `Bearer ${context.credential?.key}` },
          signal: context.signal,
        });
        if (!response.ok) throw new Error(`Bifrost model list failed: HTTP ${response.status}`);
        const { data = [] } = await response.json();
        return data.map((model) => ({
          id: model.id,
          name: label(model.id),
          api: "openai-completions",
          provider: "bifrost",
          baseUrl,
          reasoning: true,
          input: ["text", "image"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          contextWindow: 262144,
          maxTokens: 65536,
        }));
      },
    }),
  );
}
