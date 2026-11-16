import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

test("agent-browser uses the Mac browser and preserves the Linux runtime connection", () => {
  const temp = mkdtempSync(join(tmpdir(), "dotfiles-agent-browser-"));
  try {
    for (const platform of ["linux", "darwin"]) {
      const destination = join(temp, platform);
      const directory = join(destination, ".agent-browser");
      mkdirSync(directory, { recursive: true });
      const target = join(directory, "config.json");
      const existing = { cdp: "ws://runtime.example.test/chromium" };
      writeFileSync(target, JSON.stringify(existing));
      execFileSync("chezmoi", [
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
        JSON.stringify({ chezmoi: { os: platform } }),
        "apply",
        directory,
      ]);
      const actual = JSON.parse(readFileSync(target, "utf8"));
      if (platform === "linux") assert.deepEqual(actual, existing);
      else
        assert.equal(actual.executablePath, "/Applications/Chromium.app/Contents/MacOS/Chromium");
    }
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
