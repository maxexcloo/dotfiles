#!/bin/sh
# Orca owns its own skills: each release ships a stub that loads the guide out of
# the running binary, and Orca only refreshes a copy it wrote itself. Install them
# with the CLI this host has so the stubs match it, rather than pinning their
# content here.
set -eu

skills="orca-cli orchestration"

# Use the host's installed Orca. Session variables (ORCA_CLI_COMMAND and
# ORCA_DEV_REPO_ROOT) are skipped on purpose: they name the Orca that launched this
# shell, which is often a version the app is about to replace, and honouring them
# would make an apply depend on where it ran.
#   orca-ide       the Linux server build from mise
#   ~/.local/bin   the macOS app bundle's CLI
#   orca           last resort; excluded when it is GNOME's screen reader
#                  (/usr/bin/orca) or Orca's launcher for the running version
#                  (~/.orca/cli/bin/orca), which goes stale until a restart.
resolve() {
  for candidate in "$@"; do
    [ -n "$candidate" ] || continue
    path=$(command -v "$candidate" 2>/dev/null) || continue
    [ -x "$path" ] || continue
    case $path in
    /usr/bin/orca | "$HOME/.orca/cli/bin/orca") continue ;;
    esac
    printf '%s\n' "$path"
    return 0
  done
  return 1
}

if ! cli=$(resolve orca-ide "$HOME/.local/bin/orca" orca); then
  echo "Orca CLI not found; skipping Orca skills."
  exit 0
fi

# Leftovers from when Chezmoi pinned these skills itself.
for skill in $skills; do
  rm -f "$HOME/.agents/skills/$skill/LICENSE"
done

# --force replaces a copy Chezmoi wrote, which Orca reports as edited outside
# Orca; Orca backs up anything it overwrites. --agent universal writes only the
# shared folder, leaving this repository's agent links alone.
set -- skills install --agent universal --force
for skill in $skills; do
  set -- "$@" --skill "$skill"
done
"$cli" "$@"
