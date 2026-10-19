# Dotfiles

Workstation preferences for macOS, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise. Shared agent instructions and self-written skills live
in the separate [Agents repository](https://github.com/maxexcloo/agents); their
workstation links and skill discovery configuration are managed here.

## Configuration

`.chezmoiroot` selects `home/` as the source root. Its directory tree mirrors the
home directory using chezmoi attributes: `dot_config/` maps to `~/.config/`, and
`private_` restricts access to private files and directories.

Edit preferences in `home/`, then apply them. Ordinary preferences become regular
files at their application paths; edits in the checkout take effect after apply.
Codex and OpenCode use native modify templates to merge managed
preferences and MCP settings while preserving local application state and other
provider settings. Generated hook hashes, onboarding state and project trust
entries remain local.

MCP endpoints and client-specific 1Password field references are defined once in
`home/.chezmoidata.toml`. Each client uses its own LiteLLM key. Chezmoi resolves
credentials locally through the 1Password CLI and writes private application
files with mode `600`. Keep resolved values out of Git and command output.

Orca hooks and plugins, accounts, caches, history, SSH host inventories and
application databases remain application-managed. The OpenCode TUI integration is
not managed here. Git signing and SSH agent preferences are preserved.

## Usage

Install Mise and the required applications. Enable the 1Password desktop
integration and unlock the vault containing the referenced MCP fields. Homebrew
is not required for chezmoi.

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

`setup` configures chezmoi to use this checkout. `check` runs Actionlint,
Renovate configuration validation and Hk's formatting, hygiene and Fish syntax checks;
it needs the shared Mise configuration but not vault access. `status` lists
pending changes without printing credentials, but still needs vault access to
render templates. `apply` uses chezmoi's normal conflict handling. `verify`
checks the live workstation and requires vault access.

To sync another workstation, clone this repository, pull the desired revision
and run the same commands. Changes to live files are not imported automatically;
`mise use --global` and `mise upgrade --global` edit the live Mise configuration,
so reconcile those edits back into `home/`.

## Shared Agent Guidance

Clone the Agents repository beside this checkout. Chezmoi links its shared
instructions and self-written skills into `~/.agents`, then links `AGENTS.md`
into Claude Code (as `CLAUDE.md`), Codex, OpenCode and Pi. A run-on-change script also
links each skill under `home/dot_agents/skills` into `~/.claude/skills`, leaving
Claude's synced skills untouched; delete links for removed skills by hand.

This repository owns upstream skills; the Agents repository owns self-written
skills. `home/.chezmoiexternal.toml.tmpl` pins and checksums the Orca, TerraShark
and Web Awesome packages, installs them under `~/.local/share/agent-skills` and
links their skills into `~/.agents/skills`. Change package pins there and apply
through chezmoi. Personal activation and preview rules stay in the Agents
repository's `AGENTS.md`, so upstream packages remain unmodified.

## Shared Tools & Tasks

`home/dot_config/mise/config.toml` owns workstation settings and tools, using
`latest`. `ci.toml` declares the shared CI tools, also at `latest`, and disables
automatic installs. Repositories inherit these and declare exact versions only for
project-specific tools or genuine compatibility requirements.

Mise loads the shared tasks in `tasks/` globally. Repositories select them through
`depends` and keep their own tests, builds and operational tasks. Run tasks from
the repository root. Each check skips when its inputs are absent, and the global
`check` runs every shared check except TypeScript; a repository `check` task
replaces it. Checks discover their inputs: ShellCheck reads every tracked `*.sh`
file, Ruff reads the project's own configuration, and Python tests run from
`tests/`, inside the locked environment when `uv.lock` exists.

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

Every repository has a `renovate.json5` that extends the shared preset in
`renovate/default.json5`, adding only its own exceptions. Renovate's native
managers discover Actions, containers, Kubernetes, Flux, Helm, Mise, npm, Python,
Go and OpenTofu dependencies. The preset adds generic managers for Pkl packages,
raw GitHub files pinned to a commit, image references outside `image` fields and
any other pin, which is marked with a comment on the line above:

```yaml
# renovate: datasource=github-releases depName=<owner>/<repository>
version: <version>
```

`dependencies:check` runs Renovate's local platform, which looks up updates
without writing files. `dependencies:update` runs Renovate locally against the
repository on GitHub and opens a pull request per update for review. Both
resolve the GitHub token inside their own process through GitHub CLI. Presets are
read from GitHub, so changes to the shared preset take effect once merged.

GitHub Actions uses `maxexcloo/dotfiles/.github/actions/mise@main`. The action
loads only `ci.toml` and the shared tasks from its own revision, then installs the
tools in the workflow's `with.tools`; list every tool the job runs, including
those used by nested tasks. Set `project-tools: true` to also install every tool
the repository's own Mise configuration declares. It does not apply workstation preferences or resolve
credentials. Consumers follow `main` deliberately, an accepted risk because the
owner controls every consumer, so treat shared changes as changes to all of them.

## Review Changes

From an Orca-registered repository or worktree, run:

```sh
mise run orca:review
```

This global task uses Orca's native command to open changed files as focused GUI
diff tabs. Leave inline comments or select line ranges, then use **Send To Agent**
to submit the review as one batch. Choose another commit or branch in Orca's diff
toolbar when reviewing against an earlier baseline. The task opens existing
changes; it does not create commits, snapshots or agent sessions.

## Licence

AGPL-3.0 — see [LICENSE](LICENSE).
