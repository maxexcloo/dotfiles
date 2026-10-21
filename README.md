# Dotfiles

My macOS workstation preferences, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise. Shared agent instructions and my own skills live in
the separate [Agents repository](https://github.com/maxexcloo/agents), but the
links and skill discovery that wire them into the workstation are managed here.

## Configuration

`.chezmoiroot` sets `home/` as the source root. Its directory tree mirrors the
home directory using chezmoi attributes: `dot_config/` maps to `~/.config/`, and
`private_` restricts access to private files and directories.

Edit preferences in `home/`, then apply them. Ordinary preferences become regular
files at their application paths, so edits in the checkout take effect after an
apply. Claude Code, Codex, OpenCode and Pi use native modify templates to merge in
managed preferences, keeping local application state and other provider settings.
Generated hook hashes, onboarding state and project trust entries stay local.

Client update checks are disabled so Mise owns upgrades. Claude Code uses
`DISABLE_AUTOUPDATER` in its settings, Codex uses `check_for_update_on_startup`,
and OpenCode uses `update`. Pi requires `PI_SKIP_VERSION_CHECK` in the shared Mise
environment; its settings also collapse the changelog after Mise upgrades.

MCP endpoints are defined in `home/.chezmoidata.toml`. LiteLLM keys are stored in
the macOS keychain and referenced through `home/dot_config/fnox/config.toml`.
Claude and Pi retrieve their own key when connecting. Codex and OpenCode read
their keys from environment variables exported by the interactive Fish shell.
Chezmoi replaces stored LiteLLM headers with these references while preserving
unrelated client settings. Keep key values out of Git and command output.

Orca hooks and plugins, accounts, caches, history, SSH host inventories and
application databases are left to their applications. The OpenCode TUI
integration isn't managed here. Existing Git signing and SSH agent preferences
are kept.

## Usage

Install Mise and the required applications. Enable the 1Password desktop
integration for Git signing and SSH authentication. Homebrew is not required for
chezmoi.

From this checkout, bootstrap the shared Mise directory with a temporary chezmoi,
then install the global tools it declares:

```sh
mise exec chezmoi@latest -- chezmoi --source "$PWD" apply "$HOME/.config/mise"
mise install
mise run setup
mise run check
mise run status
mise run apply
mise run verify
```

`fmt` formats repository files and all shared Mise config and task files.
`setup` points chezmoi at this checkout. `check` runs Actionlint, Mise formatting,
Renovate validation, MCP merge fixtures and Hk's formatting, hygiene, Fish syntax
and ShellCheck checks. It needs the shared Mise configuration.
`status` lists pending changes without printing credentials. `apply` uses
chezmoi's normal conflict handling. `verify` checks the live workstation. These tasks do not resolve credentials or need vault
access.

To sync another workstation, clone this repository, pull the revision you want
and run the same commands. Changes to live files aren't imported automatically.
`mise use --global` and `mise upgrade --global` edit the live Mise configuration,
so copy those edits back into `home/`.

## Shared Agent Guidance

Clone the Agents repository beside this checkout. Chezmoi links its shared
instructions and skills into `~/.agents`, then links `AGENTS.md` into Codex,
OpenCode and Pi.

The `~/.agents/skills/personal` directory link exposes the sibling Agents skill
collection through recursive discovery. Adding or removing a skill needs no
per-skill dotfiles entry or linking script.

Upstream skills are managed here, and my own skills live in the Agents
repository. `home/.chezmoiexternal.toml.tmpl` pins and checksums the Humanizer, Orca,
TerraShark and Web Awesome packages, installs them under
`~/.local/share/agent-skills` and links their skills into `~/.agents/skills`.
Dotfiles maintenance owns these updates: review upstream changes, update each pin and archive checksum together,
verify extraction and apply through chezmoi. Renovate does not update these
coupled pins independently. Personal activation and preview rules stay in the
Agents repository's `AGENTS.md`, so upstream packages stay unmodified.

## Shared Tools & Tasks

`home/dot_config/mise/config.toml` holds workstation settings and tools, all on
`latest`. `ci.toml` declares the shared CI tools, also on `latest`, and turns off
automatic installs. Repositories inherit these and only declare exact versions for
project-specific tools or real compatibility requirements.

Mise loads the shared tasks in `tasks/` globally. Repositories pick them through
`depends` and keep their own tests, builds and operational tasks. Run tasks from
the repository root. Each check skips itself when its inputs are missing. The
global `check` runs every shared check except TypeScript, and a repository
`check` task replaces it. Checks find their own inputs: ShellCheck reads every
tracked `*.sh` file, Ruff reads the project's own configuration, and Python tests
run from `tests/`, inside the locked environment when `uv.lock` exists.

```toml
[tasks.check]
depends = ["check:python", "check:updates", "test:python"]
```

| Task                       | Purpose                                                    |
| -------------------------- | ---------------------------------------------------------- |
| `check`                    | Run every applicable shared check.                         |
| `check:actions`            | Lint GitHub Actions workflows.                             |
| `check:mise`               | Check Mise formatting.                                     |
| `check:oxfmt`              | Check file formatting.                                     |
| `check:python`             | Lint Python, including import order, and check formatting. |
| `check:shell`              | Check tracked shell scripts.                               |
| `check:typescript`         | Check TypeScript types.                                    |
| `check:updates`            | Validate `renovate.json5` and presets under `renovate/`.   |
| `check:whitespace`         | Check whitespace in tracked files.                         |
| `dependencies:check`       | Preview Renovate updates from the local checkout.          |
| `dependencies:mise:check`  | Preview native Mise tool upgrades.                         |
| `dependencies:mise:update` | Apply reviewed native Mise tool upgrades.                  |
| `dependencies:update`      | Open Renovate pull requests for the current repository.    |
| `fmt:mise`                 | Format Mise configuration.                                 |
| `fmt:oxfmt`                | Format project files.                                      |
| `fmt:python`               | Sort imports and format Python.                            |
| `hooks:check`              | Run all configured Hk steps.                               |
| `hooks:install`            | Install the repository's configured Git hooks.             |
| `orca:review`              | Open changed files as Orca diff tabs.                      |
| `test:python`              | Run Python unittest discovery.                             |

## Dependency Updates

Every repository with dependencies has a `renovate.json5` that extends the shared
preset in `renovate/default.json5`, adding only its own exceptions. Home Assistant
integrations also extend `renovate/home-assistant.json5`, which keeps the minimum
Home Assistant version and its test fixtures in step. Renovate's native
managers find Actions, containers, Kubernetes, Flux, Helm, Mise, npm, Python, Go
and OpenTofu dependencies, and lockfile maintenance refreshes transitive locked
packages. The preset adds generic managers for Pkl packages, raw
GitHub files pinned to a commit and image references outside `image` fields. Any
other pin gets a comment on the line above it:

```yaml
# renovate: datasource=github-releases depName=<owner>/<repository>
version: <version>
```

`dependencies:check` runs Renovate's local platform, which looks up updates
without writing files. `dependencies:update` runs Renovate locally against the
repository on GitHub and opens a pull request for each update. Both get the
GitHub token inside their own process through GitHub CLI. Presets are read from
GitHub, so changes to the shared preset take effect once they're merged.

GitHub Actions uses `maxexcloo/dotfiles/.github/actions/mise@main`. The action
loads only `ci.toml` and the shared tasks from its own revision, then installs the
tools in the workflow's `with.tools`. List every tool the job runs, including
ones used by nested tasks. Set `project-tools: true` to also install every tool
the repository's own Mise configuration declares. The action doesn't apply
workstation preferences or resolve credentials. Consumers follow `main` on
purpose. That's a risk I accept because I control every consumer, but it means a
shared change is a change to all of them.

## Review Changes

From an Orca-registered repository or worktree, run:

```sh
mise run orca:review
```

This global task uses Orca's native command to open changed files as GUI diff
tabs. Leave inline comments or select line ranges, then use **Send To Agent** to
submit the review as one batch. To review against an earlier baseline, pick
another commit or branch in Orca's diff toolbar. The task only opens existing
changes. It doesn't create commits, snapshots or agent sessions.

## Licence

AGPL-3.0 — see [LICENSE](LICENSE).
