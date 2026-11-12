import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = ["--source", root, "--config", "/dev/null", "--config-format", "toml"];
const execute = (args, input = "") =>
  execFileSync("chezmoi", [...base, ...args], { input, encoding: "utf8" });
const render = (path) => execute(["execute-template", "--file", `home/${path}`]);
const yaml = (input) =>
  JSON.parse(
    execute(
      ["execute-template", "--with-stdin", "{{ .chezmoi.stdin | fromYaml | toJson }}"],
      input,
    ),
  );
const serviceRoot = "dot_config/services/onepassword-connect";

test("Service configuration can bootstrap into a fresh home before credential templates", () => {
  const temp = mkdtempSync(join(tmpdir(), "dotfiles-services-"));
  try {
    for (const platform of ["linux", "darwin"]) {
      const destination = join(temp, platform);
      mkdirSync(join(destination, ".config"), { recursive: true });
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
      const file = platform === "linux" ? "onepassword-connect-api.container" : "compose.yaml";
      assert.ok(existsSync(join(destination, ".config/services/onepassword-connect", file)));
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

test("Connect keeps its existing Linux pod, secret and data volume", () => {
  for (const name of ["api", "sync"]) {
    const lines = render(`${serviceRoot}/onepassword-connect-${name}.container.tmpl`).split("\n");
    assert.ok(lines.includes("Pod=onepassword-connect.pod"));
    assert.ok(lines.includes("Volume=onepassword-connect:/home/opuser/.op/data"));
    assert.ok(
      lines.includes(
        "Secret=onepassword-connect-credentials,target=/home/opuser/.op/1password-credentials.json,uid=999,mode=0400",
      ),
    );
  }
  const pod = render(`${serviceRoot}/onepassword-connect.pod`);
  assert.match(pod, /^PublishPort=127\.0\.0\.1:8080:8080$/m);
  assert.match(pod, /^WantedBy=multi-user\.target$/m);
});
