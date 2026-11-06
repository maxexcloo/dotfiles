// Bifrost owns the catalogue. These prefixes are hidden because the client
// reaches them natively, or because they duplicate another Bifrost provider.
const baseUrl = "https://bifrost.excloo.com/v1";
// Pi signs in to OpenCode once for both Go and Zen, so it keeps those aliases.
const hidden = /^(deepseek|openrouter|cliproxyapi)\//;
const contextWindow = (entry: { id: string; context_length?: number }) =>
  entry.context_length ?? (entry.id.startsWith("local/") ? 262144 : 1048576);

const load = async (signal?: AbortSignal) => {
  const response = await fetch(`${baseUrl}/models`, {
    headers: { Authorization: `Bearer ${process.env.BIFROST_PI_KEY ?? ""}` },
    signal,
  });
  if (!response.ok) throw new Error(`bifrost models: ${response.status}`);
  const { data } = await response.json();
  return data
    .filter((entry: { id: string }) => !hidden.test(entry.id))
    .map((entry: { id: string; context_length?: number }) => ({
      type: "chat" as const,
      id: entry.id,
      name: entry.id,
      reasoning: true,
      input: ["text", "image"] as ("text" | "image")[],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: contextWindow(entry),
      maxTokens: 65536,
    }));
};

export default function (pi) {
  pi.registerProvider("bifrost", {
    name: "Bifrost",
    baseUrl,
    apiKey: "$BIFROST_PI_KEY",
    api: "openai-completions",
    refreshModels: async (refresh?: { signal?: AbortSignal }) => load(refresh?.signal),
  });
}
