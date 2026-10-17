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
Codex, Antigravity and OpenCode use native modify templates to merge managed
preferences and MCP settings while preserving local application state and other
provider settings. Generated hook hashes, onboarding state and project trust
entries remain local.

MCP endpoints and client-specific 1Password field references are defined once in
`home/.chezmoidata.toml`. Each client uses its own LiteLLM key. Chezmoi resolves
credentials locally through the 1Password CLI and writes private application
files with mode `600`. Keep resolved values out of Git and command output. Use
`status` to review pending changes without rendering credentials. The existing ignored `private/` directory is no
longer an active configuration source.

Orca hooks and plugins, accounts, caches, history, SSH host inventories and
application databases remain application-managed. The OpenCode TUI integration is
not managed here. Git signing and SSH agent preferences are preserved.

## Usage

Install Mise, the required applications and globally managed tools, including
Hk and the 1Password CLI. Enable the 1Password desktop integration and unlock
the vault containing the referenced MCP fields. Homebrew is not required for
chezmoi.

From this checkout:

```sh
mise install
mise run setup
mise exec -- chezmoi --source "$PWD" apply "$HOME/.config/mise"
mise run check
mise run status
mise run apply
mise run verify
```

`setup` configures chezmoi to use this checkout. `check` runs Actionlint, Ruff,
Updatecli policy validation and Hk's formatting, hygiene and Fish syntax checks.
It needs the shared Mise configuration, but does not
require vault access. Bootstrap or refresh only the shared Mise directory before
checking. `apply` uses chezmoi's normal conflict handling. `verify` checks the live
workstation and requires vault access.

To sync another workstation, clone this repository, pull the desired revision,
and run the same commands. Changes to the live files are not automatically
imported into the repository. Edit managed preferences at their source; keep
application-generated state local.

## Shared Agent Guidance

Clone the Agents repository beside this checkout. Chezmoi links its shared
instructions and self-written skills into `~/.agents`, then links `AGENTS.md`
into Antigravity, Codex, OpenCode and Pi. Antigravity's discovery configuration
is managed at `home/private_dot_gemini/config/skills.json`.

`home/.chezmoiexternal.toml.tmpl` owns pinned upstream skill packages. Chezmoi
installs Orca, TerraShark and Web Awesome under `~/.local/share/agent-skills`
and links their skills into the same `~/.agents/skills` discovery directory.
Change package pins there and apply through Chezmoi; no other project needs
its own copy. Personal activation and preview rules stay in the Agents
repository's `AGENTS.md`, so upstream packages remain unmodified.

## Shared Tools & Tasks

`home/dot_config/mise/tools.toml` owns the shared workstation tools, using `latest`.
The global `config.toml` includes it and adds personal applications. Run
`mise upgrade --global` to update workstation tools. Repositories inherit these
defaults and declare exact versions only for project-specific tools or genuine
compatibility requirements. Platform client pins follow their platform's update
policy rather than unrestricted tool bumps.
Mise automatically loads the shared checks and formatters from `tasks/` globally;
repositories select them through `depends` and keep their own tests, build steps,
operational tasks and compatibility overrides. Run tasks from the repository root.
Python tasks accept repository `vars.python_paths`, `vars.python_test_directory`,
`vars.python_test_runner` and `vars.ruff_args`. The unittest runner defaults to
`python -B`; repositories can select their locked uv environment or requirements.
ShellCheck accepts `vars.shell_paths`, defaulting to `scripts/*.sh`. The Actions
check accepts `vars.actionlint_args` for compatibility exceptions. Repositories
run npm commands directly for setup, development, builds and tests.

```toml
[tasks.check]
depends = ["check:python", "check:updates", "test:python"]

[tasks.fmt]
depends = ["fmt:python"]
```

Apply the Mise directory after pulling dotfiles to install shared task changes.
A missing shared task fails explicitly; a fresh workstation needs this global
configuration before running repository tasks.

GitHub Actions uses `maxexcloo/dotfiles/.github/actions/mise@main`. The composite
action loads only `ci.toml` and shared tasks from its own checkout, then installs
Mise and the tools selected by the workflow's `with.tools` list. `ci.toml` pins the
shared CI tools to exact versions, independently of workstation updates. Project
pins override this baseline. CI disables automatic tool installation, so later
tasks do not install the remaining workstation toolchain. List every tool used by the job, including
commands run by nested tasks or scripts. The action does not apply workstation
preferences or resolve credentials. The action and task library come
from the same action revision; publish shared changes before dependent workflows.
The `main` reference follows the shared configuration, so review shared changes as
changes to all consumers. No workflow extracts configuration from comments.

The local Updatecli policies here own the shared CI tool pins and the composite
action's Mise version; repository policies continue to own project-specific
tools. Review shared CI tool upgrades as one batch.
`dependencies:check` previews updates and `dependencies:update` applies reviewed
updates. Both accept `--labels`. Authentication, Updatecli invocation and temporary
manifest cleanup live in `lib/updatecli.py`. Images and Kubelab provide only
`vars.updatecli_discovery`, a command that writes extra manifests to its supplied
directory. AI provides `vars.updatecli_refresh`, which runs only after a successful
apply. No repository implements its own Updatecli runner.

| Task                                    | Purpose                                                     |
| --------------------------------------- | ----------------------------------------------------------- |
| `check:actions`                         | Lint GitHub Actions workflows.                              |
| `check:mise`                            | Check Mise formatting.                                      |
| `check:oxfmt`                           | Check file formatting.                                      |
| `check:python`                          | Lint Python and check formatting.                           |
| `check:shell`                           | Check configured shell script paths.                        |
| `check:typescript`                      | Check TypeScript types.                                     |
| `check:updates`                         | Validate local Updatecli policies.                          |
| `check:whitespace`                      | Check diff whitespace.                                      |
| `dependencies:check --labels <labels>`  | Preview local Updatecli changes.                            |
| `dependencies:update --labels <labels>` | Apply reviewed updates, optionally selecting policy groups. |
| `fmt:mise`                              | Format Mise configuration.                                  |
| `fmt:oxfmt`                             | Format project files.                                       |
| `fmt:python`                            | Sort imports and format Python.                             |
| `hooks:check`                           | Run all configured Hk steps.                                |
| `hooks:install`                         | Install the repository's configured Git hooks.              |
| `test:python`                           | Run Python unittest discovery.                              |

Dependency tasks resolve GitHub authentication inside their child process. The AI
repository refreshes its Python requirements and lockfile after shared updates.
Project-specific Hk steps, formatter settings and Updatecli policies remain local.

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
