import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const guard = fileURLToPath(
  new URL("../home/dot_agents/hooks/executable_agent-guard", import.meta.url),
);
// A synthetic token in GitHub's personal access token format.
const token = `ghp_${"a1B2c3D4e5F6g7H8i9J0".repeat(2).slice(0, 36)}`;
const which = (tool) =>
  execFileSync("bash", ["-c", `command -v ${tool}`], { encoding: "utf8" }).trim();
const bash = which("bash");
const run = (args, input, environment = env) =>
  execFileSync(bash, [guard, ...args], { encoding: "utf8", env: environment, input });
const post = (stdout, environment) =>
  run(["post", "claude"], JSON.stringify({ tool_response: { stdout } }), environment);

test("pre blocks dotenv files but not code that reads the environment", () => {
  const pre = (command) =>
    run(["pre"], JSON.stringify({ tool_input: { command } }), { ...env, AUTO: "1" });
  for (const command of ["cat .env", "cat ./.env.local", "less app/cloudflared.env"])
    assert.throws(() => pre(command), { status: 2 }, command);
  for (const command of ["node -e 'process.env.HOME'", "kubectl get -o jsonpath='{.env}'"])
    assert.equal(pre(command), "", command);
});

test("post redacts secrets and passes clean output through", () => {
  const redacted = JSON.parse(post(`token=${token}`));
  assert.equal(redacted.hookSpecificOutput.updatedToolOutput.stdout, "token=[REDACTED]\n");
  assert.equal(post("nothing to see"), "");
});

test("output is withheld when gitleaks cannot scan it", () => {
  // Expose only the tools the guard needs besides gitleaks.
  const bin = mkdtempSync(join(tmpdir(), "agent-guard-"));
  try {
    for (const tool of ["cat", "jq"]) symlinkSync(which(tool), join(bin, tool));
    const environment = { ...env, PATH: bin };
    const withheld = JSON.parse(post(`token=${token}`, environment)).hookSpecificOutput;
    assert.match(withheld.updatedToolOutput.stdout, /withheld/);
    assert.match(withheld.additionalContext, /could not scan/);
    assert.match(run(["redact"], `token=${token}`, environment), /withheld/);
  } finally {
    rmSync(bin, { force: true, recursive: true });
  }
});

test("listed commands ask unless the agent was started with AUTO=1", () => {
  // The guard reads its list from beside itself.
  const dir = mkdtempSync(join(tmpdir(), "agent-guard-"));
  try {
    copyFileSync(guard, join(dir, "agent-guard"));
    writeFileSync(join(dir, "agent-guard-ask"), "kubectl apply\nssh\n");
    const pre = (agent, command, environment = env) =>
      execFileSync(bash, [join(dir, "agent-guard"), "pre", agent], {
        encoding: "utf8",
        env: environment,
        input: JSON.stringify({ tool_input: { command } }),
        stdio: "pipe",
      });
    const ask = JSON.parse(pre("claude", "kubectl -n x apply -f app.yaml")).hookSpecificOutput;
    assert.equal(ask.permissionDecision, "ask");
    assert.match(pre("pi", "cd x && ssh host"), /ssh needs approval/);
    assert.throws(() => pre("codex", "ssh host"), { status: 2 });
    assert.equal(pre("claude", "kubectl get pods; ssh-keygen -l"), "");
    assert.equal(pre("claude", "ssh host", { ...env, AUTO: "1" }), "");
  } finally {
    rmSync(dir, { force: true, recursive: true });
  }
});
