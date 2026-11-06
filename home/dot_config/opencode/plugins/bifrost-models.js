import { Model, Plugin, Provider } from "@opencode/plugin";

// Bifrost owns the catalogue. These prefixes are hidden because the client
// reaches them natively, or because they duplicate another Bifrost provider.
const baseURL = "https://bifrost.excloo.com/v1";
const providerID = Provider.ID.make("bifrost");
const hidden = /^(deepseek|openrouter|opencode-go|opencode-zen|cliproxyapi)\//;
const context = (entry) =>
  entry.context_length ?? (entry.id.startsWith("local/") ? 262144 : 1048576);

const load = async () => {
  const response = await fetch(`${baseURL}/models`, {
    headers: { Authorization: `Bearer ${process.env.BIFROST_OPENCODE_KEY ?? ""}` },
  });
  if (!response.ok) throw new Error(`bifrost models: ${response.status}`);
  const { data } = await response.json();
  return data
    .filter((entry) => !hidden.test(entry.id))
    .map((entry) => {
      const model = Model.Info.default(providerID, Model.ID.make(entry.id));
      return {
        ...model,
        name: entry.id,
        limit: { ...model.limit, context: context(entry) },
      };
    });
};

export default Plugin.define({
  id: "bifrost-models",
  setup: async (ctx) => {
    const source = { models: [] };
    let registered = false;
    const refresh = async () => {
      source.models = await load();
      if (registered) return ctx.provider.reload();
      await ctx.provider.transform((editor) => editor.models.set("bifrost", source.models));
      registered = true;
    };
    await refresh().catch(console.error);
    const timer = setInterval(() => void refresh().catch(console.error), 300_000);
    return () => clearInterval(timer);
  },
});
