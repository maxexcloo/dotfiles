import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("native user applications follow Homelab endpoints and host membership", () => {
  const temp = mkdtempSync(join(tmpdir(), "dotfiles-user-apps-"));
  try {
    const bin = join(temp, "bin");
    mkdirSync(bin);
    const inventory = {
      machines: { mercury: {}, mars: {} },
      services: {
        "mars/syncthing": {
          machine: "mars",
          hostnames: ["mars.example.test"],
          scheme: "http",
          url: "http://mars.example.test:8384",
        },
        "mercury/agent-browser": {
          machine: "mercury",
          hostname: "browser.example.test",
          hostnames: ["browser.example.test"],
          scheme: "https",
          url: "https://browser.example.test",
        },
        "mercury/dsh": {
          machine: "mercury",
          hostname: "dsh.example.test",
          hostnames: ["dsh.example.test", "code.example.test"],
          scheme: "https",
          url: "https://dsh.example.test",
        },
        "mercury/syncthing": {
          machine: "mercury",
          hostname: "sync.example.test",
          hostnames: ["sync.example.test"],
          scheme: "https",
          url: "https://sync.example.test",
        },
      },
    };
    writeFileSync(join(bin, "curl"), '#!/bin/sh\nprintf "%s\\n" "$HOMELAB_TEST_INVENTORY"\n');
    chmodSync(join(bin, "curl"), 0o700);
    for (const [platform, hostname] of [
      ["linux", "Mercury.example.test"],
      ["darwin", "MacBook-Pro"],
      ["linux", "mars"],
      ["linux", "unknown"],
    ]) {
      const destination = join(temp, hostname);
      const directory = join(destination, ".agent-browser");
      mkdirSync(directory, { recursive: true });
      for (const parent of ["containers", "dsh", "services", "systemd"])
        mkdirSync(join(destination, ".config", parent), { recursive: true });
      const target = join(directory, "config.json");
      const existing = {
        timeout: 5000,
        cdp: "ws://previous.example.test/chromium",
        ...(platform === "darwin" && {
          executablePath: "/Applications/Chromium.app/Contents/MacOS/Chromium",
        }),
      };
      writeFileSync(target, JSON.stringify(existing));
      execFileSync(
        "chezmoi",
        [
          "--source",
          root,
          "--config",
          "/dev/null",
          "--config-format",
          "toml",
          "--destination",
          destination,
          "--persistent-state",
          join(destination, "state.boltdb"),
          "--cache",
          join(temp, "cache"),
          "--override-data",
          JSON.stringify({
            chezmoi: { os: platform, hostname },
            services: {
              "agent-browser": { port: 14848 },
              browserless: { port: 19222 },
              dsh: { port: 13080 },
              syncthing: { port: 18384 },
              traefik: { port: 18443 },
            },
          }),
          "apply",
          directory,
          join(destination, ".config/systemd/user"),
          join(destination, ".config/containers/systemd"),
          join(destination, ".config/dsh"),
          join(destination, ".config/services"),
          join(destination, ".config/traefik"),
        ],
        {
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            HOMELAB_TEST_INVENTORY: JSON.stringify(inventory),
          },
        },
      );
      const actual = JSON.parse(readFileSync(target, "utf8"));
      const browserlessCompose = join(destination, ".config/services/browserless/compose.yaml");
      const browserlessQuadlet = join(
        destination,
        ".config/containers/systemd/browserless.container",
      );
      const dsh = join(destination, ".config/systemd/user/dsh.service");
      const proxy = join(destination, ".config/containers/systemd/traefik.container");
      const yaml = (path) =>
        JSON.parse(
          execFileSync(
            "chezmoi",
            [
              "--config",
              "/dev/null",
              "--config-format",
              "toml",
              "execute-template",
              "--with-stdin",
              "{{ .chezmoi.stdin | fromYaml | toJson }}",
            ],
            { input: readFileSync(path), encoding: "utf8" },
          ),
        );
      if (platform === "darwin") {
        assert.deepEqual(actual, { timeout: 5000, cdp: "ws://127.0.0.1:19222/chromium" });
        const browserless = yaml(browserlessCompose).services.browserless;
        assert.equal(browserless.network_mode, "host");
        assert.equal(browserless.environment.HOST, "127.0.0.1");
        assert.equal(browserless.environment.PORT, "19222");
        assert.equal(existsSync(browserlessQuadlet), false);
        assert.equal(existsSync(dsh), false);
        assert.equal(existsSync(proxy), false);
      } else if (hostname.startsWith("Mercury")) {
        assert.deepEqual(actual, { timeout: 5000, cdp: "ws://127.0.0.1:19222/chromium" });
        assert.equal(statSync(target).mode & 0o777, 0o600);
        const unit = readFileSync(dsh, "utf8");
        assert.match(
          unit,
          /--port 13080 --public-url https:\/\/dsh.example.test\/ --trusted-host dsh.example.test --trusted-host code.example.test/,
        );
        assert.match(
          readFileSync(join(destination, ".config/systemd/user/agent-browser.service"), "utf8"),
          /--port 14848 --allowed-origins https:\/\/browser.example.test/,
        );
        assert.match(readFileSync(browserlessQuadlet, "utf8"), /Environment=PORT=19222/);
        assert.equal(existsSync(browserlessCompose), false);
        assert.match(
          readFileSync(
            join(destination, ".config/systemd/user/default.target.d/agents.conf"),
            "utf8",
          ),
          /Wants=agent-browser.service dsh.service/,
        );
        const routes = yaml(join(destination, ".config/traefik/routes.yaml")).http;
        assert.deepEqual(Object.keys(routes.routers), ["agent-browser", "dsh", "syncthing"]);
        assert.equal(
          routes.routers.dsh.rule,
          "Host(`dsh.example.test`) || Host(`code.example.test`)",
        );
        assert.equal(routes.routers["agent-browser"].rule, "Host(`browser.example.test`)");
        assert.equal(routes.routers.dsh.tls.certResolver, "cloudflare");
        assert.equal(routes.services.dsh.loadBalancer.servers[0].url, "http://127.0.0.1:13080");
        assert.equal(
          routes.services["agent-browser"].loadBalancer.servers[0].url,
          "http://127.0.0.1:14848",
        );
        assert.equal(
          routes.services.syncthing.loadBalancer.servers[0].url,
          "http://127.0.0.1:18384",
        );
        assert.equal(routes.services.syncthing.loadBalancer.passHostHeader, false);
        assert.equal(
          yaml(join(destination, ".config/traefik/traefik.yaml")).entryPoints.websecure.address,
          "127.0.0.1:18443",
        );
        assert.match(
          readFileSync(join(destination, ".config/containers/systemd/traefik.container"), "utf8"),
          /Volume=%h\/.config\/traefik:\/etc\/traefik:ro,Z/,
        );
      } else {
        assert.deepEqual(actual, existing);
        assert.equal(existsSync(dsh), false);
        assert.equal(existsSync(proxy), false);
      }
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
