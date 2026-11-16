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
        "mercury/agent-browser": {
          machine: "mercury",
          upstream: "http://127.0.0.1:14848",
          browser_upstream: "http://127.0.0.1:19222",
          url: "https://browser.example.test",
        },
        "mercury/dsh": {
          machine: "mercury",
          upstream: "https://127.0.0.1:13080",
          hostname: "code.example.test",
          url: "https://code.example.test",
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
      for (const parent of ["containers", "dsh", "systemd"])
        mkdirSync(join(destination, ".config", parent), { recursive: true });
      const target = join(directory, "config.json");
      const existing = { timeout: 5000, cdp: "ws://previous.example.test/chromium" };
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
          JSON.stringify({ chezmoi: { os: platform, hostname } }),
          "apply",
          directory,
          join(destination, ".config/systemd/user"),
          join(destination, ".config/containers/systemd"),
          join(destination, ".config/dsh"),
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
      const dsh = join(destination, ".config/systemd/user/dsh.service");
      if (platform === "darwin") {
        assert.equal(actual.executablePath, "/Applications/Chromium.app/Contents/MacOS/Chromium");
        assert.equal(actual.cdp, undefined);
        assert.equal(actual.timeout, 5000);
        assert.equal(existsSync(dsh), false);
      } else if (hostname.startsWith("Mercury")) {
        assert.deepEqual(actual, { timeout: 5000, cdp: "ws://127.0.0.1:19222/chromium" });
        assert.equal(statSync(target).mode & 0o777, 0o600);
        const unit = readFileSync(dsh, "utf8");
        assert.match(
          unit,
          /--port 13080 --public-url https:\/\/code.example.test\/ --trusted-host code.example.test/,
        );
        assert.match(unit, /ExecStartPre=%h\/.config\/dsh\/tls.sh/);
        assert.equal(statSync(join(destination, ".config/dsh/tls.sh")).mode & 0o111, 0o111);
        assert.match(
          readFileSync(join(destination, ".config/systemd/user/agent-browser.service"), "utf8"),
          /--port 14848 --allowed-origins https:\/\/browser.example.test/,
        );
        assert.match(
          readFileSync(
            join(destination, ".config/containers/systemd/browserless.container"),
            "utf8",
          ),
          /Environment=PORT=19222/,
        );
        assert.match(
          readFileSync(
            join(destination, ".config/systemd/user/default.target.d/agents.conf"),
            "utf8",
          ),
          /Wants=agent-browser.service dsh.service/,
        );
      } else {
        assert.deepEqual(actual, existing);
        assert.equal(existsSync(dsh), false);
      }
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
