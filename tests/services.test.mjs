import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = ["--source", root, "--config", "/dev/null", "--config-format", "toml"];
const execute = (args, input = "") =>
  execFileSync("chezmoi", [...base, ...args], { input, encoding: "utf8" });
const render = (path, platform = "darwin", services) =>
  execute([
    "--override-data",
    JSON.stringify({ chezmoi: { os: platform }, ...(services ? { services } : {}) }),
    "execute-template",
    "--file",
    `home/${path}`,
  ]);
const yaml = (input) =>
  JSON.parse(
    execute(
      ["execute-template", "--with-stdin", "{{ .chezmoi.stdin | fromYaml | toJson }}"],
      input,
    ),
  );
const serviceRoot = "dot_config/services/onepassword-connect";

test("Connect configuration follows its platform owner without reading credentials", () => {
  const temp = mkdtempSync(join(tmpdir(), "dotfiles-services-"));
  try {
    for (const platform of ["linux", "darwin"]) {
      const destination = join(temp, platform);
      const connect = join(destination, ".config/services/onepassword-connect");
      mkdirSync(connect, { recursive: true });
      writeFileSync(join(connect, "compose.yaml"), "old Compose definition\n");
      execFileSync(
        "chezmoi",
        [
          ...base,
          "--destination",
          destination,
          "--persistent-state",
          join(destination, "state.boltdb"),
          "--cache",
          join(temp, "cache"),
          "--override-data",
          JSON.stringify({ chezmoi: { os: platform } }),
          "apply",
          join(destination, ".config/services"),
        ],
        { env: { ...process.env, PATH: `${root}tests/bin:${process.env.PATH}` } },
      );
      const file = "compose.yaml";
      assert.ok(existsSync(join(connect, file)));
      if (platform === "linux")
        assert.equal(readFileSync(join(connect, file), "utf8"), "old Compose definition\n");
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test("Connect keeps its macOS project, named volume and read-only credential mount", () => {
  const config = yaml(render(`${serviceRoot}/compose.yaml.tmpl`));
  assert.equal(config.name, "onepassword-connect");
  assert.deepEqual(config.volumes, { data: {} });
  for (const name of ["connect-api", "connect-sync"]) {
    const service = config.services[name];
    assert.equal(service.restart, "unless-stopped");
    assert.equal(service.volumes[0], "data:/home/opuser/.op/data");
    assert.deepEqual(service.volumes[1], {
      type: "bind",
      read_only: true,
      source: "${XDG_CONFIG_HOME:-${HOME}/.config}/op/connect/1password-credentials.json",
      target: "/home/opuser/.op/1password-credentials.json",
      bind: { create_host_path: false },
    });
  }
});
