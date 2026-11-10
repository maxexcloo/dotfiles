# Dotfiles

My macOS workstation preferences, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise; the same source sets up a Linux host for sandboxed
agents. Shared agent instructions and my own skills live in the separate
[Agents repository](https://github.com/maxexcloo/agents), but the links and skill
discovery that wire them into the workstation are managed here.

## Configuration

Edit preferences in `home/`, then run `chezmoi apply`. The tree mirrors the home
directory using chezmoi attributes. Credential-bearing preferences use native
modify templates to preserve unrelated application settings and local state.

MCP endpoints are defined in `home/.chezmoidata.toml`. Bifrost keys are stored in
the 1Password Automation vault and referenced through
`home/dot_config/fnox/config.toml`. Its service account token must be in the macOS
keychain. Launch the agents through their Fish wrappers to provide their keys.
Keep key values out of Git and command output.

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
anywhere afterwards. Use `mise tasks` to discover tasks, `mise run fmt` to format
files and `mise run check` to validate them. Formatting and checks need the shared
Mise configuration; they do not resolve credentials or need vault access.

To sync another workstation, clone this repository, pull the revision you want
and run the same commands. Changes to live files aren't imported automatically.
`mise use --global` and `mise upgrade --global` edit the live Mise configuration,
so copy those edits back into `home/`.

## Agent Sandboxes

On Linux, Fish abbreviations run Claude Code, Codex, OpenCode and Pi through
[nono](https://github.com/nolabs-ai/nono) with the profiles in
`home/dot_config/nono/profiles`. Each extends the upstream profile for its agent,
adds Mise tools and read access to the shared agent guidance, and allows writes
only in the directory the agent starts in. Start an agent in `~/Projects` to work
across projects.

The profiles add the Bifrost keys and a GitHub token (`GitHub Agents` in the
Automation vault) from the host's
[local services](https://github.com/maxexcloo/local-services) Connect server, and
pass its token through so agents can use the vaults that server reads. Save the
token as `token` beside the Connect credentials file and pull the upstream
profiles once with
`nono pull nolabs-ai/claude nolabs-ai/codex nolabs-ai/opencode nolabs-ai/pi`.
Agents commit unsigned and push with the GitHub token.

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
