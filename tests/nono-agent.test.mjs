import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const launcher = fileURLToPath(
  new URL("../home/dot_local/bin/executable_nono-agent", import.meta.url),
);

test("agent launch retains nono and removes its temporary Orca authority after exit", () => {
  const directory = mkdtempSync(join(tmpdir(), "nono-agent-"));
  try {
    const bin = join(directory, "bin");
    const main = join(directory, "main");
    mkdirSync(bin);
    mkdirSync(main);
    writeFileSync(join(main, "todo.md"), "- [ ] Fixture task\n");
    for (const [name, source] of Object.entries({
      git: `const args = process.argv.slice(2);
if (args[0] === "rev-parse") console.log(${JSON.stringify(join(main, ".git"))});
else if (args[0] === "--exec-path") console.log(${JSON.stringify(join(directory, "git-core"))});
else console.log(${JSON.stringify(`worktree ${main}\n`)});`,
      mise: `const args = process.argv.slice(2);
if (args[0] === "ls") console.log(JSON.stringify({ node: [{ version: "24", install_path: ${JSON.stringify(join(directory, "node"))} }] }));
else console.log(${JSON.stringify(join(directory, "node/bin"))});`,
      nono: `const fs = require("node:fs");
const args = process.argv.slice(2);
const profilePath = args[args.indexOf("--profile") + 1];
const profile = profilePath === "codex" ? null : JSON.parse(fs.readFileSync(profilePath, "utf8"));
console.log(JSON.stringify({ args, profile, profilePath }));`,
    })) {
      const path = join(bin, name);
      writeFileSync(path, `#!/usr/bin/env node\n${source}\n`);
      chmodSync(path, 0o755);
    }
    const orca = join(directory, "orca");
    writeFileSync(
      orca,
      `export ORCA_USER_DATA_PATH='${directory}/orca-data'\nexec '/usr/bin/node' '${directory}/orca/out/cli/index.js' "$@"\n`,
    );
    const environment = {
      ...process.env,
      ORCA_CLI_COMMAND: orca,
      ORCA_TERMINAL_ID: "bound-worker",
      ORCA_WORKTREE_ID: "fixture",
      PATH: `${bin}:${process.env.PATH}`,
      XDG_CONFIG_HOME: join(directory, "config"),
    };
    const run = (agent, args, env = environment) => {
      const process = spawnSync("python3", [launcher, agent, ...args], { encoding: "utf8", env });
      assert.equal(process.status, 0, process.stderr);
      return JSON.parse(process.stdout);
    };
    const codex = run("codex", ["--model", "fixture"]);
    assert.deepEqual(codex.args.slice(-5), [
      "--",
      "codex",
      "--dangerously-bypass-approvals-and-sandbox",
      "--model",
      "fixture",
    ]);
    const bypassFlags = ["--dangerously-bypass-approvals-and-sandbox", "--yolo"];
    for (const flag of bypassFlags) {
      const fullAccess = run("codex", [flag, "--model", "fixture"]);
      assert.equal(fullAccess.args.filter((arg) => bypassFlags.includes(arg)).length, 1);
    }
    assert.equal(codex.profile.extends, "codex");
    assert.deepEqual(codex.profile.command_policies.executable_dirs, [
      join(directory, "git-core"),
      join(directory, "node/bin"),
    ]);
    assert.deepEqual(codex.profile.filesystem, { read_file: [join(main, "todo.md")] });
    assert.equal(
      codex.profile.command_policies.commands.orca.from.session.invocation_policy.default,
      "deny",
    );
    assert.equal(existsSync(codex.profilePath), false);
    const brokerEnvironment =
      codex.profile.command_policies.commands["orca-node"].from.orca.environment;
    assert.equal(brokerEnvironment.set_vars.ORCA_TERMINAL_ID, "bound-worker");
    assert.equal(brokerEnvironment.allow_vars.includes("ORCA_*"), false);
    const claude = run("claude", []);
    assert.deepEqual(JSON.parse(claude.args.at(-1)), { sandbox: { enabled: false } });
    assert.ok(claude.args.includes("--dangerously-skip-permissions"));
    assert.equal(existsSync(claude.profilePath), false);
    const opencode = run("opencode", []);
    assert.deepEqual(opencode.args.slice(-3), ["--", "opencode", "--auto"]);
    const pi = run("pi", []);
    assert.deepEqual(pi.args.slice(-2), ["--", "pi"]);
    const ordinaryEnvironment = { ...environment };
    delete ordinaryEnvironment.ORCA_WORKTREE_ID;
    assert.equal(run("codex", [], ordinaryEnvironment).profile, null);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("worker mail rejects routing overrides before invoking the privileged CLI", () => {
  const directory = mkdtempSync(join(tmpdir(), "nono-mail-"));
  try {
    const backend = join(directory, "orca-node");
    writeFileSync(
      backend,
      "#!/usr/bin/env node\nconsole.log(JSON.stringify(process.argv.slice(2)));\n",
    );
    chmodSync(backend, 0o755);
    const run = (args) =>
      spawnSync("python3", [launcher, "--orca-mail", ...args], {
        encoding: "utf8",
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}` },
      });
    for (const args of [
      ["orchestration", "check", "--peek", "--json"],
      ["orchestration", "ask", "--question=A worker question"],
      [
        "orchestration",
        "send",
        "--type",
        "worker_done",
        "--outcome",
        "succeeded",
        "--body",
        "Test passed",
      ],
      ["skills", "get", "orchestration", "--reference", "references/messaging-and-gates.md"],
    ]) {
      const result = run(args);
      assert.equal(result.status, 0, result.stderr);
      assert.deepEqual(JSON.parse(result.stdout), args);
    }
    for (const args of [
      ["terminal", "list"],
      ["orchestration", "send", "--type=dispatch"],
      ["orchestration", "ask", "--question", "--terminal=other"],
      ["orchestration", "check", "--peek=true"],
      ["orchestration", "send", "--body"],
      ...[
        "--dispatch-capability",
        "--environment",
        "--from",
        "--pairing-code",
        "--run",
        "--terminal",
        "--to",
      ].flatMap((flag) => [
        ["orchestration", "check", flag, "other"],
        ["orchestration", "check", `${flag}=other`],
      ]),
    ]) {
      const result = run(args);
      assert.equal(result.status, 126, `${args.join(" ")}: ${result.stderr}`);
      assert.equal(result.stdout, "");
      assert.match(result.stderr, /Orca worker mail denied/);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
