"""Run repository Updatecli policies with optional repository-owned discovery."""

import argparse
import os
import shlex
import subprocess
import tempfile
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("apply", "diff", "validate"))
    parser.add_argument("--labels", default="")
    arguments = parser.parse_args()
    environment = os.environ.copy()
    if arguments.action != "validate" and not environment.get("GITHUB_TOKEN"):
        environment["GITHUB_TOKEN"] = (
            environment.get("GH_TOKEN")
            or subprocess.check_output(
                ["gh", "auth", "token"],
                text=True,
            ).strip()
        )
    discovery = environment.get("UPDATECLI_DISCOVERY", "")
    with tempfile.TemporaryDirectory(prefix="updatecli-discovery-") as directory:
        command = [
            "updatecli",
            "manifest" if arguments.action == "validate" else "pipeline",
            arguments.action,
            "--config",
            ".updatecli.d",
        ]
        if discovery:
            subprocess.run(
                [*shlex.split(discovery), directory], check=True, env=environment
            )
            if any(Path(directory).glob("*.yaml")):
                command += ["--config", directory]
        if arguments.action == "validate":
            command += ["--disable-templating"]
        else:
            command += ["--disable-changelog", "--disable-udash-report"]
        if arguments.labels:
            command += ["--labels", arguments.labels]
        if arguments.action == "validate":
            command += ["--strict"]
        command += ["--unique-tmp-dir"]
        subprocess.run(command, check=True, env=environment)


if __name__ == "__main__":
    main()
