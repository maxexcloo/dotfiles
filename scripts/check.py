"""Validate tracked configuration and active workstation links."""

import json
from pathlib import Path
import subprocess
import sys
import tomllib

ROOT = Path(__file__).resolve().parent.parent

for path in sorted(ROOT.rglob('*')):
    if not path.is_file() or '.git' in path.parts or 'private' in path.relative_to(ROOT).parts:
        continue
    if path.suffix == '.json':
        json.loads(path.read_text())
    elif path.suffix == '.toml':
        tomllib.loads(path.read_text())
    elif path.suffix == '.py':
        compile(path.read_text(), str(path), 'exec')
    elif path.suffix == '.fish':
        subprocess.run(['fish', '--no-execute', str(path)], check=True)

subprocess.run([sys.executable, str(ROOT / 'scripts/link.py'), '--check'], check=True)
subprocess.run(['git', 'diff', '--check'], check=True, cwd=ROOT)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True, cwd=ROOT)
print('Configuration syntax and Git whitespace checks passed')
