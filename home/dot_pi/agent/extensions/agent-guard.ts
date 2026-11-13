import { execFileSync } from "node:child_process";
import { homedir } from "node:os";
import { isAbsolute, relative, resolve } from "node:path";

const guard = `${process.env.HOME}/.agents/hooks/agent-guard`;
const run = (mode: string, input: string, ...args: string[]) =>
  execFileSync(guard, [mode, ...args], { input, encoding: "utf8", stdio: "pipe" });

export default function (pi) {
  pi.on("tool_call", async (event, ctx) => {
    let ask: string;
    try {
      ask = run("pre", JSON.stringify({ tool_input: event.input }), "pi");
    } catch (error) {
      return { block: true, reason: String(error.stderr || error.message).trim() };
    }
    if (!ask && (event.toolName === "edit" || event.toolName === "write")) {
      const target = resolve(String(event.input.path).replace(/^~(?=\/|$)/, homedir()));
      const inside = relative(process.cwd(), target);
      if (inside === ".." || inside.startsWith("../") || isAbsolute(inside))
        ask = `agent-guard: writing ${target} outside the working directory needs approval.`;
    }
    if (
      ask &&
      !(ctx.hasUI && (await ctx.ui.confirm(ask, event.input.command ?? event.input.path)))
    ) {
      return { block: true, reason: `${ask} The user did not approve it.` };
    }
  });
  pi.on("tool_result", async (event) => {
    if (event.toolName !== "bash") return;
    const content = event.content.map((part) =>
      part.type === "text" ? { ...part, text: run("redact", part.text) } : part,
    );
    return { content, structuredContent: undefined };
  });
}
