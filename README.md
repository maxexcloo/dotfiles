# Dotfiles

My macOS workstation preferences, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise; the same source sets up agents on Linux. Shared agent
instructions and my own skills live in the separate
[Agents repository](https://github.com/maxexcloo/agents), but the links and skill
discovery that wire them into the workstation are managed here.

## Configuration

Edit preferences in `home/`, then run `chezmoi apply`. The tree mirrors the home
directory using chezmoi attributes. Credential-bearing preferences use native
modify templates to preserve unrelated application settings and local state.

MCP endpoints are defined in `home/.chezmoidata.toml`. Bifrost keys are stored in
the 1Password Automation vault and referenced through
`home/dot_config/fnox/config.toml`. Fnox and the 1Password CLI read vaults
through the machine's 1Password Connect server, managed here with the
`services:connect` Mise task. Save its token as `token` beside
the Connect credentials file. `chezmoi apply` writes each agent's Bifrost key into
its private configuration. Keep key values out of Git and command output.

## Usage

Install Homebrew, then the packages and applications in `home/dot_Brewfile` with
`brew bundle --file home/dot_Brewfile`; after setup, `brew bundle --global` keeps
them in sync. Enable the 1Password desktop integration for Git signing and SSH
authentication on macOS.

From this checkout, bootstrap the shared Mise directory with a temporary chezmoi,
then install the global tools it declares:

```sh
mise exec chezmoi@latest -- chezmoi --source "$PWD" apply "$HOME/.config/mise"
mise install
mise run setup
chezmoi apply "$HOME/.config/services"
mise run services:connect
mise run check
chezmoi status
chezmoi apply
```

`setup` points chezmoi at this checkout, so plain `chezmoi` commands work from
anywhere afterwards. Use `mise tasks` to discover tasks, `mise run fmt` to format
files and `mise run check` to validate them. Formatting and checks need the shared
Mise configuration; they do not resolve credentials or need vault access.

To sync another workstation, clone this repository, pull the revision you want
and run the same commands. Changes to live files aren't imported automatically.
`mise use --global` and `mise upgrade --global` edit the live Mise configuration,
so copy those edits back into `home/`.

## Workstation Services

Compose definitions live in `~/.config/services`. Apply them with chezmoi before
using the small `services:*` Mise tasks to start a service. macOS uses Docker
Compose through OrbStack; Mercury uses rootful `podman-compose` so Connect keeps
its existing Podman volume and secret. Homelab owns Mercury’s boot service.

Mercury’s switch from Quadlets to Compose requires an approved handover: stop the
old Connect pod, start the Compose stack, then verify credential-backed access and
retained data before removing the old Quadlet files. The Compose definition uses
the existing volume and secret as external resources; do not recreate them or run
both owners at once. Keep the old definitions available until that verification.
The macOS project, data volume, credential mount and OrbStack endpoint stay the same.

## Agent Launch

Launch Claude Code, Codex, OpenCode and Pi directly. In Orca, reset each agent's
Command to its executable name and use its native permission controls. Select
Auto for supporting agents; Codex uses its workspace sandbox with automatic
approval review. Put environment variables in Orca's Environment setting.

Claude also enables its native Bash sandbox and refuses unsandboxed retries.
OpenCode asks before shell commands or access outside the project; existing
permission rules are preserved. Keep its `--auto` flag off to retain those prompts.
Pi has no native sandbox or equivalent permission gate.

Agent logins, sessions and history stay on each machine. Sign in once per agent
per machine; keep existing agent homes when changing launch settings.

Before applying this removal, use `nono list --installed` and `nono remove` for
each installed pack so its native unwiring removes hooks and plugin registration.
Apply the preferences, then remove the installed nono tool with `mise uninstall nono`.
Restart Fish sessions to unload functions already in memory. These are explicit
activation steps after review.

## Agent Threads

[Atuin Threads](https://docs.atuin.sh/18.24/ai/threads/) is enabled with native
daemon autostart; use Atuin 18.24+ on both Mac and Mercury. Capture includes
conversations, tool inputs/outputs and edit diffs, including the whole session
when continuing an old one. Threads sync end-to-end encrypted through the
existing auto-sync; both machines need the same Atuin account and encryption
key. Local transcripts and the search index remain sensitive.

Use `atuin resume` to search and resume, `atuin resume THREAD_ID --fork` to fork,
or `atuin resume THREAD_ID --in codex` to continue in another agent. Keep the
matching checkout available: Threads carries context, not repository files or
Orca workspace state. Native resume uses agent executables from `PATH`.

Run `atuin mcp install` to register the native stdio server with installed agents,
then restart them. This grants read access to shell history and captured threads;
see [native MCP setup](https://docs.atuin.sh/18.24/ai/mcp/).

## Shared Agent Guidance

Clone the Agents repository beside this checkout. Chezmoi links its shared
instructions and skills into the workstation. Claude Code loads that repository
as a plugin because it does not discover the shared skill collection recursively.

Upstream skills are installed through `home/.chezmoiexternal.toml`. Keep personal
rules in the Agents repository so upstream packages stay unmodified.

## Shared Tools & Tasks

`home/dot_config/mise/conf.d/tools.toml` declares shared tools;
`home/dot_config/mise/config.toml` adds workstation-only configuration.

Mise loads the shared tasks globally; `mise tasks` lists them. Repositories select
them through `depends` and keep their own tests, builds and operational tasks.
Run tasks from the repository root. Checks skip when their inputs are missing.
A project's task overrides the shared task of the same name, including `check`
and `fmt`.

```toml
[tasks.check]
depends = ["check:python", "check:updates", "test:python"]
```

## Project Notes

Syncthing shares project notes between macOS and Linux. The macOS application
already manages its own service. Bluemax provides Linux's native Syncthing package;
[Homelab](https://github.com/maxexcloo/homelab) enables its packaged
`syncthing@core.service` on Mercury at boot, running as `core`. Pair Mercury with
the Mac in Syncthing and share the existing Projects folder at `~/Projects`.
Linux's local ignore rules include only each project's root `todo.md` and
`todo-*.md`; source files and Git directories stay local. Pairing and device
identities remain in Syncthing's own configuration.

Before the first synchronisation, keep a copy of both machines' notes and
reconcile any differing versions. Syncthing retains conflicting edits as
`sync-conflict` files; review those before removing either copy.

## Dependency Updates

Repositories with dependencies extend
`github>maxexcloo/dotfiles//renovate/default.json5` in `renovate.json5`, adding only
their own exceptions. Home Assistant integrations also extend
`github>maxexcloo/dotfiles//renovate/home-assistant.json5` to keep their minimum
Home Assistant version and test fixtures in step.

For pins the shared preset does not detect automatically, add a comment on the
line above:

```yaml
# renovate: datasource=github-releases depName=<owner>/<repository>
version: <version>
```

The Mend Renovate app runs on GitHub; each repository's Dependency Dashboard lists
pending updates. Shared presets are read from GitHub, so changes take effect once
merged.

GitHub Actions uses `maxexcloo/dotfiles/.github/actions/mise@main`. The action
loads only the shared tools and tasks from its own revision, then installs the
tools in the workflow's `with.tools`. Set `project-tools: true` to also install
every tool the repository's own Mise configuration declares. The action doesn't
apply workstation preferences or resolve credentials.

## Licence

AGPL-3.0 — see [LICENSE](LICENSE).
