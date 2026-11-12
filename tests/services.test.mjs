import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const base = ["--source", root, "--config", "/dev/null", "--config-format", "toml"];
const execute = (args, input = "") =>
  execFileSync("chezmoi", [...base, ...args], { input, encoding: "utf8" });
const render = (path, services, platform = "darwin") =>
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
          JSON.stringify({ chezmoi: { os: platform }, ...(services ? { services } : {}) }),
          "apply",
          join(destination, ".config/services"),
        ],
        { env: { ...process.env, PATH: `${root}tests/bin:${process.env.PATH}` } },
      );
      const file = "compose.yaml";
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

test("Linux Compose reuses Connect’s rootful external volume and secret", () => {
  const config = yaml(render(`${serviceRoot}/compose.yaml.tmpl`, undefined, "linux"));
  assert.equal(config.name, "onepassword-connect");
  assert.deepEqual(config.volumes, { data: { external: true, name: "onepassword-connect" } });
  assert.deepEqual(config.secrets, { "onepassword-connect-credentials": { external: true } });
  assert.deepEqual(config.services["connect-api"].ports, ["127.0.0.1:8080:8080"]);
  for (const name of ["connect-api", "connect-sync"]) {
    assert.deepEqual(config.services[name].volumes, ["data:/home/opuser/.op/data"]);
    assert.deepEqual(config.services[name].secrets, [
      {
        source: "onepassword-connect-credentials",
        target: "/home/opuser/.op/1password-credentials.json",
        uid: "999",
        mode: "0400",
      },
    ]);
  }
});

test("Browserless uses the same configured port across both runtimes and the client", () => {
  const services = JSON.parse(execute(["execute-template", "{{ .services | toJson }}"]));
  services.browserless.port = 19333;
  const compose = yaml(render("dot_config/services/browserless/compose.yaml.tmpl", services));
  assert.equal(compose.name, "browserless");
  assert.deepEqual(compose.services.browserless.ports, ["127.0.0.1:19333:3000"]);
  const linux = yaml(
    render("dot_config/services/browserless/compose.yaml.tmpl", services, "linux"),
  );
  assert.deepEqual(linux, compose);
  const client = JSON.parse(render("dot_agent-browser/private_config.json.tmpl", services));
  assert.equal(client.cdp, "ws://127.0.0.1:19333/chromium");
});

test("Project browser server matches its installed client and exposes only loopback", () => {
  const temp = mkdtempSync(join(tmpdir(), "dotfiles-playwright-"));
  try {
    mkdirSync(join(temp, "bin"));
    symlinkSync(process.execPath, join(temp, "bin/node"));
    mkdirSync(join(temp, "node_modules/playwright"), { recursive: true });
    writeFileSync(
      join(temp, "node_modules/playwright/package.json"),
      JSON.stringify({ version: "1.65.0" }),
    );
    writeFileSync(
      join(temp, ".mise.toml"),
      `[task_config]\nincludes = [${JSON.stringify(join(root, "home/dot_config/mise/tasks/services.toml"))}]\n`,
    );
    for (const runtime of ["docker", "podman"]) {
      const path = join(temp, "bin", runtime);
      writeFileSync(
        path,
        "#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2)));\n",
      );
      chmodSync(path, 0o755);
    }
    const output = execFileSync(
      "mise",
      ["run", "--skip-tools", "services:playwright", "--port", "19334"],
      {
        cwd: temp,
        encoding: "utf8",
        env: {
          ...process.env,
          MISE_CONFIG_DIR: join(temp, "config"),
          MISE_GLOBAL_CONFIG_FILE: join(temp, "global.toml"),
          MISE_DATA_DIR: join(temp, "data"),
          MISE_CACHE_DIR: join(temp, "cache"),
          MISE_TRUSTED_CONFIG_PATHS: temp,
          PATH: `${join(temp, "bin")}:${process.env.PATH}`,
        },
      },
    );
    assert.match(output, /PW_TEST_CONNECT_WS_ENDPOINT=ws:\/\/127\.0\.0\.1:19334\//);
    assert.match(output, /PW_TEST_CONNECT_EXPOSE_NETWORK='<loopback>'/);
    const args = JSON.parse(output.trim().split("\n").at(-1));
    assert.equal(args[args.indexOf("--publish") + 1], "127.0.0.1:19334:3000");
    assert.ok(args.includes("mcr.microsoft.com/playwright:v1.65.0-noble"));
    assert.ok(args.includes("playwright@1.65.0"));
    assert.ok(args.includes("--rm"));
    assert.equal(args.includes("--volume"), false);
    assert.equal(args.includes("--mount"), false);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
