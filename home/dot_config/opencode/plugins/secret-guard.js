import { execFileSync } from "node:child_process";
import { Plugin } from "@opencode/plugin";

const guard = `${process.env.HOME}/.agents/hooks/secret-guard`;
const run = (mode, input) =>
  execFileSync(guard, [mode], { input, encoding: "utf8", stdio: "pipe" });

// Why: only shell output can echo a secret that the pre-hook's path check was
// unable to see.

// Why: a result carries the same text in model-visible content parts and in the
// tool's typed output, so every string in either field is a leak candidate.
const redactValue = (value) => {
  if (typeof value === "string") return run("redact", value);
  if (Array.isArray(value)) return value.map(redactValue);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactValue(entry)]),
    );
  return value;
};

export default Plugin.define({
  id: "secret-guard",
  setup: async (ctx) => {
    await ctx.tool.hook("execute.before", (event) => {
      try {
        run("pre", JSON.stringify({ tool_input: event.input }));
      } catch (error) {
        throw new Error(String(error.stderr || error.message).trim());
      }
    });

    await ctx.tool.hook("execute.after", (event) => {
      if (event.tool !== "shell") return;
      if (event.status === "error") {
        event.error.message = run("redact", event.error.message);
        return;
      }
      const result = { ...event.result };
      if (result.content !== undefined) result.content = redactValue(result.content);
      if (result.output !== undefined) result.output = redactValue(result.output);
      event.result = result;
    });
  },
});
