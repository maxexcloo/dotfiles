import { execFileSync } from "node:child_process";

const guard = `${process.env.HOME}/.agents/hooks/secret-guard`;
const run = (mode, input) =>
  execFileSync(guard, [mode], { input, encoding: "utf8", stdio: "pipe" });

export const SecretGuard = async () => ({
  "tool.execute.before": async (_input, output) => {
    try {
      run("pre", JSON.stringify({ tool_input: output.args }));
    } catch (error) {
      throw new Error(String(error.stderr || error.message).trim());
    }
  },
  "tool.execute.after": async (input, output) => {
    if (input.tool === "bash") output.output = run("redact", output.output);
  },
});
