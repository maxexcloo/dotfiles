# Dotfiles

My macOS workstation preferences, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise; the same source sets up agents on Linux. Shared agent
instructions and my own skills live in the separate
[Agents repository](https://github.com/maxexcloo/agents).

## Usage

Install Homebrew, then the packages and applications in `home/dot_Brewfile` with
`brew bundle --file home/dot_Brewfile`; after setup, `brew bundle --global` keeps
them in sync. Enable the 1Password desktop integration for Git signing and SSH
authentication on macOS.

Fnox and the 1Password CLI read vaults through the machine's 1Password Connect
server. Save its token as `token` beside the Connect credentials file.

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

Edit preferences in `home/`, then run `chezmoi apply`. To sync another
workstation, pull the revision you want and run the same commands.
`mise use --global` and `mise upgrade --global` edit the live Mise configuration,
so copy those edits back into `home/`.

Run `atuin mcp install` once per machine to register Atuin's MCP server with
installed agents.

## Shared Agent Guidance

Clone the Agents repository beside this checkout; `chezmoi apply` links it into
each agent.

## Shared Tools & Tasks

Mise loads the shared tasks globally. Repositories select them through `depends`;
a project's task overrides the shared task of the same name.

```toml
[tasks.check]
depends = ["check:python", "check:updates", "test:python"]
```

GitHub Actions uses `maxexcloo/dotfiles/.github/actions/mise@main` with the tools
a job needs in `with.tools`; set `project-tools: true` to also install the tools
the repository's Mise configuration declares.

## Dependency Updates

Repositories extend `github>maxexcloo/dotfiles//renovate/default.json5` in
`renovate.json5`, adding only their own exceptions. Home Assistant integrations
also extend `github>maxexcloo/dotfiles//renovate/home-assistant.json5`.

For pins the shared preset does not detect, add a comment on the line above:

```yaml
# renovate: datasource=github-releases depName=<owner>/<repository>
version: <version>
```

## Licence

AGPL-3.0 — see [LICENSE](LICENSE).
