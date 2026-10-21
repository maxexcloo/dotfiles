import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "node:process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const guard = fileURLToPath(
  new URL("../home/dot_agents/hooks/executable_secret-guard", import.meta.url),
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

test("post redacts secrets and passes clean output through", () => {
  const redacted = JSON.parse(post(`token=${token}`));
  assert.equal(redacted.hookSpecificOutput.updatedToolOutput.stdout, "token=[REDACTED]\n");
  assert.equal(post("nothing to see"), "");
});

test("output is withheld when gitleaks cannot scan it", () => {
  // Expose only the tools the guard needs besides gitleaks.
  const bin = mkdtempSync(join(tmpdir(), "secret-guard-"));
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
