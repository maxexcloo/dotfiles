import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const execute = (args, input = "") =>
  execFileSync(
    "chezmoi",
    ["--source", root, "--config", "/dev/null", "--config-format", "toml", ...args],
    { input, encoding: "utf8" },
  );
const render = (input) =>
  execute(
    ["execute-template", "--with-stdin", "--file", "home/dot_config/atuin/modify_config.toml"],
    input,
  );
const decode = (input) =>
  JSON.parse(
    execute(
      ["execute-template", "--with-stdin", "{{ .chezmoi.stdin | fromToml | toJson }}"],
      input,
    ),
  );

test("Atuin preserves native opt-in and opt-out across repeated applies", () => {
  for (const capture of [false, true]) {
    const local = `
sync_address = "https://sync.example"
redact_patterns = ["fixture-pattern"]
[threads]
capture = ${capture}
capture_tools = false
[daemon]
enabled = ${capture}
autostart = ${capture}
[sync]
frequency = "10m"
`;
    const output = render(local);
    const result = decode(output);
    const original = decode(local);
    assert.deepEqual(result.threads, original.threads);
    assert.deepEqual(result.daemon, original.daemon);
    assert.equal(result.sync_address, original.sync_address);
    assert.deepEqual(result.redact_patterns, original.redact_patterns);
    assert.equal(result.sync.frequency, original.sync.frequency);
    assert.equal(result.sync.records, true);
    assert.equal(result.auto_sync, true);
    assert.equal(result.search_mode, "fuzzy");
    assert.equal(render(output), output);
  }
});

test("Atuin provisions shell preferences without enabling Threads or its daemon", () => {
  const output = render("");
  const result = decode(output);
  assert.equal(result.threads, undefined);
  assert.equal(result.daemon, undefined);
  assert.equal(result.logs.enabled, false);
  assert.equal(result.filter_mode_shell_up_key_binding, "directory");
  assert.equal(render(output), output);
});
