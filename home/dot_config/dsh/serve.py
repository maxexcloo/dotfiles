import os
import re
import signal
import subprocess
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

runtime = Path(os.environ["RUNTIME_DIRECTORY"])
launch_file = runtime / "launch-url"
launch_file.unlink(missing_ok=True)
secret = os.environ["BIFROST_DSH_KEY"]
command = [
    "dsh",
    "--profile",
    "web",
    "--patch",
    str(Path(__file__).with_name("bifrost.yaml")),
    "--no-open",
    *sys.argv[1:],
]
process = subprocess.Popen(
    command,
    stdout=subprocess.PIPE,
    stderr=subprocess.STDOUT,
    text=True,
    errors="replace",
    bufsize=1,
)


def forward_signal(number, _frame):
    process.send_signal(number)


signal.signal(signal.SIGTERM, forward_signal)
signal.signal(signal.SIGINT, forward_signal)
for line in process.stdout:
    authenticated = False
    for url in re.findall(r"https?://[^\s\x1b]+", line):
        if "token" in parse_qs(urlsplit(url).query):
            descriptor = os.open(
                launch_file, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600
            )
            with os.fdopen(descriptor, "w") as target:
                target.write(url + "\n")
            authenticated = True
    if authenticated:
        print(
            "dsh: browser login URL saved to the private runtime launch-url file",
            flush=True,
        )
    elif "token=" not in line:
        print(line.replace(secret, "[REDACTED]"), end="", flush=True)
status = process.wait()
sys.exit(status if status >= 0 else 128 - status)
