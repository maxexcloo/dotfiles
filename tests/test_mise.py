"""Exercise shared tasks through Mise without installing tools or using credentials."""

import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class SharedMiseTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="shared-mise-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.project = self.root / "project with spaces"
        self.project.mkdir()
        self.configuration = self.root / "configuration"
        self.configuration.mkdir()
        shutil.copytree(
            ROOT / "home/dot_config/mise/tasks", self.configuration / "tasks"
        )
        shutil.copytree(ROOT / "home/dot_config/mise/lib", self.configuration / "lib")
        (self.configuration / "config.toml").write_text("")
        self.log = self.root / "commands.jsonl"
        self.bin = self.root / "bin"
        self.bin.mkdir()
        (self.bin / "python").symlink_to(sys.executable)
        for name in ("node", "prek", "ruff", "shellcheck", "updatecli"):
            executable = self.bin / name
            executable.write_text(
                f"#!{sys.executable}\n"
                "import json, os, pathlib, sys\n"
                "with open(os.environ['MISE_TEST_LOG'], 'a') as output:\n"
                "    output.write(json.dumps([pathlib.Path(sys.argv[0]).name, "
                "os.getcwd(), sys.argv[1:]]) + '\\n')\n"
                "sys.exit(1 if os.environ.get('MISE_TEST_FAILURE') == "
                "pathlib.Path(sys.argv[0]).name else 0)\n"
            )
            executable.chmod(0o755)
        self.environment = dict(
            os.environ,
            MISE_CACHE_DIR=str(self.root / "cache"),
            MISE_CONFIG_DIR=str(self.configuration),
            MISE_DATA_DIR=str(self.root / "data"),
            MISE_GLOBAL_CONFIG_FILE=str(self.configuration / "config.toml"),
            MISE_STATE_DIR=str(self.root / "state"),
            MISE_TEST_LOG=str(self.log),
            MISE_TRUSTED_CONFIG_PATHS=str(self.root),
            GITHUB_TOKEN="test-placeholder",
            PATH=f"{self.bin}:{os.environ['PATH']}",
        )
        self.mise = shutil.which("mise")
        self.assertIsNotNone(self.mise)

    def run_task(self, name):
        return subprocess.run(
            [self.mise, "run", name],
            check=False,
            cwd=self.project,
            env=self.environment,
            capture_output=True,
            text=True,
        )

    def commands(self):
        return [json.loads(line) for line in self.log.read_text().splitlines()]

    def test_global_checks_run_once_in_the_consuming_repository(self):
        (self.project / "mise.toml").write_text(
            '[tasks.check]\ndepends = ["check:python", "check:updates"]\n'
            'run = "echo repository-check"\n'
        )
        result = self.run_task("check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("repository-check", result.stdout)
        commands = self.commands()
        self.assertEqual(len(commands), 3)
        self.assertTrue(
            all(
                Path(command[1]).resolve() == self.project.resolve()
                for command in commands
            )
        )
        self.assertEqual(
            sorted((command[0], command[2]) for command in commands),
            [
                ("ruff", ["check", "."]),
                ("ruff", ["format", "--check", "."]),
                (
                    "updatecli",
                    [
                        "manifest",
                        "validate",
                        "--config",
                        ".updatecli.d",
                        "--disable-templating",
                        "--strict",
                        "--unique-tmp-dir",
                    ],
                ),
            ],
        )

    def test_repository_variables_reach_shared_checks_and_formatters(self):
        (self.project / "mise.toml").write_text(
            '[vars]\npython_paths = "components"\nruff_args = "--extend-select I"\n'
            '[tasks.check]\ndepends = ["check:python"]\n'
            '[tasks.fmt]\ndepends = ["fmt:python"]\n'
        )
        for task in ("check", "fmt"):
            result = self.run_task(task)
            self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            [command[2] for command in self.commands()],
            [
                ["check", "--extend-select", "I", "components"],
                ["format", "--check", "components"],
                ["check", "--fix", "--select", "I", "components"],
                ["format", "components"],
            ],
        )

    def test_failed_shared_check_prevents_repository_check(self):
        (self.project / "mise.toml").write_text(
            '[tasks.check]\ndepends = ["check:python"]\nrun = "echo repository-check"\n'
        )
        self.environment["MISE_TEST_FAILURE"] = "ruff"
        result = self.run_task("check")
        self.assertNotEqual(result.returncode, 0)
        self.assertNotIn("repository-check", result.stdout)
        self.assertEqual(len(self.commands()), 1)

    def test_hooks_are_available_without_workstation_preferences(self):
        result = self.run_task("hooks:check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.commands()[0][::2], ["prek", ["run", "--all-files"]])

    def test_ci_tasks_and_nested_exec_do_not_install_unselected_tools(self):
        for name in ("ci.toml", "tools.toml"):
            shutil.copy(ROOT / "home/dot_config/mise" / name, self.configuration)
        self.environment["MISE_GLOBAL_CONFIG_FILE"] = str(
            self.configuration / "ci.toml"
        )
        (self.project / "mise.toml").write_text(
            '[tasks.check]\nrun = ["node", "mise exec -- node"]\n'
        )
        result = self.run_task("check")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([command[0] for command in self.commands()], ["node", "node"])
        self.assertFalse((self.root / "data/installs").exists())

    def test_shellcheck_expands_repository_patterns_and_preserves_spaces(self):
        (self.project / "scripts").mkdir()
        (self.project / "helpers").mkdir()
        (self.project / "scripts/a script.sh").write_text("#!/bin/sh\nexit 0\n")
        (self.project / "helpers/another.sh").write_text("#!/bin/sh\nexit 0\n")
        (self.project / "mise.toml").write_text(
            '[vars]\nshell_paths = "scripts/*.sh helpers/*.sh"\n'
        )
        result = self.run_task("check:shell")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(
            self.commands()[0][::2],
            ["shellcheck", ["scripts/a script.sh", "helpers/another.sh"]],
        )

    def test_unittest_uses_configured_runner_and_test_directory(self):
        directory = self.project / "unit tests"
        directory.mkdir()
        (directory / "test_sample.py").write_text(
            "import unittest\n"
            "class Sample(unittest.TestCase):\n"
            "    def test_sample(self):\n"
            "        self.assertEqual(2 + 2, 4)\n"
        )
        runner = self.bin / "test python"
        runner.write_text(
            f"#!{sys.executable}\n"
            "import os, pathlib, sys\n"
            "pathlib.Path('runner-used').touch()\n"
            "os.execv(sys.executable, [sys.executable, *sys.argv[1:]])\n"
        )
        runner.chmod(0o755)
        (self.project / "mise.toml").write_text(
            '[vars]\npython_test_directory = "unit tests"\npython_test_runner = '
            + json.dumps(shlex.join([str(runner), "-B"]))
            + "\n"
        )
        result = self.run_task("test:python")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.project / "runner-used").exists())
        self.assertIn("Ran 1 test", result.stdout + result.stderr)

    def test_dependency_preview_uses_discovery_and_cleans_up(self):
        generator = self.project / "discover updates.py"
        generator.write_text(
            "import pathlib, sys\n"
            "pathlib.Path(sys.argv[1], 'generated.yaml').write_text('name: Test\\n')\n"
            "pathlib.Path('discovery-directory').write_text(sys.argv[1])\n"
        )
        (self.project / "mise.toml").write_text(
            "[vars]\nupdatecli_discovery = "
            + json.dumps(shlex.join([sys.executable, str(generator)]))
            + "\n"
        )
        result = subprocess.run(
            [self.mise, "run", "dependencies:check", "--labels", "group:test"],
            check=False,
            cwd=self.project,
            env=self.environment,
            capture_output=True,
            text=True,
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        directory = (self.project / "discovery-directory").read_text()
        command = self.commands()[0][2]
        self.assertEqual(command[:3], ["pipeline", "diff", "--config"])
        self.assertIn(directory, command)
        self.assertIn("group:test", command)
        self.assertFalse(Path(directory).exists())
        self.assertNotIn("test-placeholder", result.stdout + result.stderr)

    def test_failed_update_prevents_repository_refresh(self):
        (self.project / "mise.toml").write_text(
            '[vars]\nupdatecli_refresh = "touch refreshed"\n'
        )
        self.environment["MISE_TEST_FAILURE"] = "updatecli"
        result = self.run_task("dependencies:update")
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.project / "refreshed").exists())

    def test_successful_update_runs_repository_refresh(self):
        (self.project / "mise.toml").write_text(
            '[vars]\nupdatecli_refresh = "touch refreshed"\n'
        )
        result = self.run_task("dependencies:update")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue((self.project / "refreshed").exists())


if __name__ == "__main__":
    unittest.main()
