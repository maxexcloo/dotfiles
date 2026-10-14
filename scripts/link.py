"""Link workstation configuration without overwriting existing files."""

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    links = json.loads((ROOT / 'links.json').read_text())
    errors = []
    pending = []
    for source, destination in links.items():
        path = ROOT / source
        target = Path.home() / destination
        if not path.is_file():
            errors.append(f'Missing source: {source}')
        elif target.is_symlink() and target.resolve() == path:
            continue
        elif target.exists() or target.is_symlink():
            errors.append(f'Existing destination requires manual review: {destination}')
        elif args.check:
            errors.append(f'Missing link: {destination}')
        else:
            pending.append((path, target))
    if errors:
        raise SystemExit('\n'.join(errors))
    for source, target in pending:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.symlink_to(source)
    print(f'{len(links)} configuration links verified' if args.check else f'{len(pending)} links created')


if __name__ == '__main__':
    main()
