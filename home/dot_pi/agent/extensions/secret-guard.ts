import { execFileSync } from "node:child_process";

const guard = `${process.env.HOME}/.agents/hooks/secret-guard`;
const run = (mode: string, input: string) =>
  execFileSync(guard, [mode], { input, encoding: "utf8", stdio: "pipe" });

export default function (pi) {
  pi.on("tool_call", async (event) => {
    try {
      run("pre", JSON.stringify({ tool_input: event.input }));
    } catch (error) {
      return { block: true, reason: String(error.stderr || error.message).trim() };
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
