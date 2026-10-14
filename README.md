# Dotfiles

Workstation preferences for macOS, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise. Shared agent instructions, skills and discovery remain
in the separate [Agents repository](https://github.com/maxexcloo/agents).

## Configuration

`.chezmoiroot` selects `home/` as the source root. Its directory tree mirrors the
home directory using chezmoi attributes: `dot_config/` maps to `~/.config/`, and
`private_` restricts access to private files and directories.

Edit preferences in `home/`, then apply them. Ordinary preferences become regular
files at their application paths; edits in the checkout take effect after apply.
Codex, Antigravity and OpenCode use native modify templates to merge managed
preferences and MCP settings while preserving local application state and other
provider settings. Generated hook hashes, onboarding state and project trust
entries remain local.

MCP endpoints and 1Password field references are defined once in
`home/.chezmoidata.toml`. Chezmoi resolves the credentials locally through the
1Password CLI and writes private application files with mode `600`. Keep resolved
values out of Git and command output. Use `status` to review pending changes
without rendering credentials. The existing ignored `private/` directory is no
longer an active configuration source.

Orca hooks and plugins, accounts, caches, history, SSH host inventories and
application databases remain application-managed. The OpenCode TUI integration is
not managed here. Git signing and SSH agent preferences are preserved.

## Usage

Install Mise, the required applications and globally managed tools, including
Prek and the 1Password CLI. Enable the 1Password desktop integration and unlock
the vault containing the referenced MCP fields. Homebrew is not required for
chezmoi.

From this checkout:

```sh
mise install
mise run setup
mise run check
mise run status
mise run apply
mise run verify
```

`setup` configures chezmoi to use this checkout. `check` runs Prek's built-in
configuration and hygiene checks plus Fish's native syntax check; it does not
require a provisioned workstation or vault access. `apply` uses chezmoi's normal
conflict handling. `verify` checks the live workstation and requires vault access.

To sync another workstation, clone this repository, pull the desired revision,
and run the same commands. Changes to the live files are not automatically
imported into the repository. Edit managed preferences at their source; keep
application-generated state local.

## Global Tasks

Run these tasks from the repository root. The global Mise configuration owns their
implementation; repository Updatecli policies and Prek hooks remain local.

| Task | Purpose |
| --- | --- |
| `dependencies:check` | Preview local Updatecli changes. |
| `dependencies:update --labels <labels>` | Apply reviewed updates, optionally selecting policy groups. |
| `hooks:check` | Run all configured Prek hooks. |
| `hooks:install` | Install the repository's configured Git hooks. |

Dependency tasks resolve GitHub authentication inside their child process. The AI
repository adds its Python requirements and lockfile refresh after a successful
shared update. The hidden `dependencies:apply` task holds that shared implementation.
Project `check` and `setup` tasks retain direct Prek commands where needed for fresh
checkouts and CI without this personal configuration. Install this global config
on any workstation that should run the shared dependency tasks.

## Review Changes

From an Orca-registered repository or worktree, run:

```sh
mise run review
```

This global task uses Orca's native command to open changed files as focused GUI
diff tabs. Leave inline comments or select line ranges, then use **Send To Agent**
to submit the review as one batch. Choose another commit or branch in Orca's diff
toolbar when reviewing against an earlier baseline. The task opens existing
changes; it does not create commits, snapshots or agent sessions.

## Licence

AGPL-3.0 — see [LICENSE](LICENSE).
