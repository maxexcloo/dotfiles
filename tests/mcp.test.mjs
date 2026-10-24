import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = ["--source", root, "--config", "/dev/null", "--config-format", "toml"];
const execute = (args, input = "") =>
  execFileSync("chezmoi", [...base, ...args], { input, encoding: "utf8" });
const inventory = JSON.parse(execute(["execute-template", "{{ .mcp | toJson }}"]));
for (const [name, server] of Object.entries(inventory))
  server.url = `https://managed.example/mcp/${name}`;
const override = ["--override-data", JSON.stringify({ mcp: inventory })];
const nest = (path, value) =>
  path.split(".").reduceRight((inner, key) => ({ [key]: inner }), value);
const dig = (path, value) => path.split(".").reduce((inner, key) => inner[key], value);
const convert = (input, expression) =>
  execute(["execute-template", "--with-stdin", expression], input);

for (const [client, path, section, credential] of [
  ["Claude", "home/modify_private_dot_claude.json", "mcpServers", "headersHelper"],
  [
    "Codex",
    "home/private_dot_codex/modify_private_config.toml",
    "mcp_servers",
    "bearer_token_env_var",
  ],
  ["OpenCode", "home/dot_config/opencode/modify_private_opencode.json", "mcp.servers", "headers"],
  ["Pi", "home/dot_pi/agent/modify_private_mcp.json", "mcpServers", "headers"],
]) {
  const encode = (value) =>
    client === "Codex"
      ? convert(JSON.stringify(value), "{{ .chezmoi.stdin | fromJson | toToml }}")
      : JSON.stringify(value);
  const decode = (value) =>
    JSON.parse(
      client === "Codex" ? convert(value, "{{ .chezmoi.stdin | fromToml | toJson }}") : value,
    );
  const render = (input) =>
    execute([...override, "execute-template", "--with-stdin", "--file", path], input);

  test(`${client} provisions fresh inventory and preserves unrelated entries`, () => {
    for (const existing of [false, true]) {
      const foreign = {
        url: "https://foreign.example/bifrost.excloo.com/mcp",
        headers: { Authorization: "fixture" },
      };
      const sameUrl = {
        url: inventory.home_assistant.url,
        headers: { Authorization: "other-fixture" },
      };
      const config = existing
        ? {
            unrelated: true,
            ...nest(section, {
              foreign,
              same_url: sameUrl,
              home_assistant: {
                url: "https://obsolete.example/mcp",
                timeout: 12,
                headers: { Authorization: "stale-fixture" },
              },
            }),
          }
        : {};
      const output = render(encode(config));
      const result = decode(output);
      const servers = dig(section, result);
      for (const [name, managed] of Object.entries(inventory)) {
        assert.equal(servers[name].url, managed.url);
        assert.ok(servers[name][credential]);
      }
      if (existing) {
        assert.equal(result.unrelated, true);
        assert.equal(servers.home_assistant.timeout, client === "Pi" ? 15 : 12);
        assert.deepEqual(servers.foreign, foreign);
        assert.deepEqual(servers.same_url, sameUrl);
      }
      assert.equal(render(output), output);
    }
  });
}
