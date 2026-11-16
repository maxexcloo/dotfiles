import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
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

const launcher = fileURLToPath(new URL("../home/dot_config/dsh/serve.py", import.meta.url));

test("dsh service captures its login credential privately and redacts credentials from logs", () => {
  const directory = mkdtempSync(join(tmpdir(), "dotfiles-dsh-"));
  try {
    const runtime = join(directory, "runtime");
    mkdirSync(runtime, { mode: 0o700 });
    const fakeDsh = join(directory, "dsh");
    const key = "fixture-bifrost-key";
    const url = "https://code.example.test/?token=fixture-launch-token";
    writeFileSync(
      fakeDsh,
      `#!/bin/sh\nprintf '%s\\n' '${url}' 'key=${key}' 'ordinary startup message'\nexit 7\n`,
    );
    chmodSync(fakeDsh, 0o700);
    const result = spawnSync("python3", [launcher, "--port", "3080"], {
      encoding: "utf8",
      env: {
        ...process.env,
        BIFROST_DSH_KEY: key,
        PATH: `${directory}:${process.env.PATH}`,
        RUNTIME_DIRECTORY: runtime,
      },
    });
    assert.equal(result.status, 7);
    assert.equal(result.stderr, "");
    assert.ok(result.stdout.includes("ordinary startup message"));
    assert.ok(result.stdout.includes("[REDACTED]"));
    assert.ok(!result.stdout.includes(key));
    assert.ok(!result.stdout.includes("fixture-launch-token"));
    assert.equal(readFileSync(join(runtime, "launch-url"), "utf8"), `${url}\n`);
    assert.equal(statSync(join(runtime, "launch-url")).mode & 0o777, 0o600);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
