const baseURL = "https://bifrost.excloo.com/v1";

const label = (id) =>
  id
    .slice(id.lastIndexOf("/") + 1)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const model = (id) => ({
  id,
  providerID: "bifrost",
  api: { id, url: baseURL, npm: "@ai-sdk/openai-compatible" },
  name: label(id),
  capabilities: {
    temperature: true,
    reasoning: true,
    attachment: true,
    toolcall: true,
    input: { text: true, audio: false, image: true, video: false, pdf: false },
    output: { text: true, audio: false, image: false, video: false, pdf: false },
    interleaved: { field: "reasoning_content" },
  },
  cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
  limit: { context: 262144, output: 65536 },
  status: "active",
  options: {},
  headers: {},
  release_date: "2026-01-01",
});

// Bifrost lists the checkpoint Bento has loaded, so /models always shows the
// real model name instead of a fixed alias.
export const Bifrost = async () => ({
  config: async (config) => {
    config.provider = {
      ...config.provider,
      bifrost: {
        name: "Bifrost",
        npm: "@ai-sdk/openai-compatible",
        options: { baseURL, apiKey: "{env:BIFROST_OPENCODE_KEY}" },
      },
    };
  },
  provider: {
    id: "bifrost",
    models: async () => {
      const response = await fetch(`${baseURL}/models`, {
        headers: { authorization: `Bearer ${process.env.BIFROST_OPENCODE_KEY}` },
      });
      if (!response.ok) throw new Error(`Bifrost model list failed: HTTP ${response.status}`);
      const { data = [] } = await response.json();
      return Object.fromEntries(data.map((entry) => [entry.id, model(entry.id)]));
    },
  },
});
