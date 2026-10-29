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

MCP endpoints and the Bifrost text model are defined in `home/.chezmoidata.toml`.
Bifrost keys are stored in the 1Password Automation vault and referenced through
`home/dot_config/fnox/config.toml`, which reads them with a service account whose
token is in the macOS keychain. Claude retrieves its own key when connecting.
Codex, OpenCode and Pi read their keys from environment variables that their Fish
wrapper functions set at launch. Chezmoi replaces stored Bifrost headers with
these references while preserving unrelated client settings. Keep key values out
of Git and command output.

Pi and OpenCode use Bifrost's stable `local/auto` model, which forwards to whichever
local model Bento has loaded, so a workload switch needs no client change.

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
chezmoi status
chezmoi apply
```

`setup` points chezmoi at this checkout, so plain `chezmoi` commands work from
anywhere afterwards. `fmt` formats repository files and all shared Mise config
and task files. `check` runs Actionlint, Mise formatting, Renovate validation,
MCP merge and secret-guard redaction fixtures and Hk's formatting, hygiene and
ShellCheck checks. It needs the shared Mise configuration. None of these resolve
credentials or need vault access.

To sync another workstation, clone this repository, pull the revision you want
and run the same commands. Changes to live files aren't imported automatically.
`mise use --global` and `mise upgrade --global` edit the live Mise configuration,
so copy those edits back into `home/`.

## Shared Agent Guidance

Clone the Agents repository beside this checkout. Chezmoi links its shared
instructions and skills into `~/.agents`, then links `AGENTS.md` into Claude
Code, Codex and Pi. OpenCode falls back to Claude Code's `~/.claude/CLAUDE.md`.

The `~/.agents/skills/personal` directory link exposes the sibling Agents skill
collection through recursive discovery. Adding or removing a skill needs no
per-skill dotfiles entry or linking script.

Claude Code doesn't read `~/.agents/skills` or recurse into collections. It
loads the Agents repository as a plugin instead, enabled through
`home/dot_claude/modify_private_settings.json`, and `home/dot_claude/skills/`
mirrors each upstream skill link.

Upstream skills are managed here, and my own skills live in the Agents
repository. `home/.chezmoiexternal.toml.tmpl` pins the Humanizer, Orca
and TerraShark packages for Renovate, installs them under
`~/.local/share/agent-skills` and links their skills into `~/.agents/skills`.
Personal activation and preview rules stay in the Agents repository's
`AGENTS.md`, so upstream packages stay unmodified.

## Shared Tools & Tasks

`home/dot_config/mise/conf.d/tools.toml` declares the tools shared by the
workstation and CI, and `config.toml` adds workstation-only settings and tools,
all on `latest`. Repositories inherit these and only declare exact versions for
project-specific tools or real compatibility requirements.

Mise loads the shared tasks in `tasks/` globally; `mise tasks` lists them.
Repositories pick them through `depends` and keep their own tests, builds and
operational tasks. Run tasks from the repository root. Each check skips itself
when its inputs are missing. The global `check` runs every shared check except
TypeScript, plus `test:python`, where a project's own override wins. A
repository `check` task replaces it. Checks find their own inputs: ShellCheck
reads every tracked `*.sh` file, Ruff reads the project's own configuration, and
Python tests run from `tests/`, inside the locked environment when `uv.lock`
exists.

```toml
[tasks.check]
depends = ["check:python", "check:updates", "test:python"]
```

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

The Mend Renovate app runs the preset on GitHub. It groups minor and patch
updates into one pull request per repository and automerges them, digests and
lockfile maintenance once checks pass. Major updates open their own pull
requests that request the owner's review and are not automerged; each
repository's Dependency Dashboard issue lists everything pending. Presets are read from
GitHub, so changes to the shared preset take effect once they're merged.

GitHub Actions uses `maxexcloo/dotfiles/.github/actions/mise@main`. The action
loads only the shared tools and tasks from its own revision, then installs the
tools in the workflow's `with.tools`. Set `project-tools: true` to also install
every tool the repository's own Mise configuration declares. The action doesn't
apply workstation preferences or resolve credentials.

## Licence

AGPL-3.0 — see [LICENSE](LICENSE).
