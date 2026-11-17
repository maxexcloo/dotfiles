# Dotfiles

My macOS workstation preferences, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise; the same source sets up agents on Linux. Shared agent
instructions and my own skills live in the separate
[Agents repository](https://github.com/maxexcloo/agents).

## Usage

On macOS, install Homebrew, then the packages and applications in
`home/dot_Brewfile` with `brew bundle --file home/dot_Brewfile`; after setup,
`brew bundle --global` keeps them in sync. Linux hosts get Mise from their
image. Enable the 1Password desktop integration for SSH authentication
on macOS.

Fnox signs in to 1Password through the desktop app on macOS. On Linux, keep a
service account token as `OP_SERVICE_ACCOUNT_TOKEN` in the unmanaged
`~/.config/fnox/service-account.toml`. Projects that select the `connect` fnox
profile use this machine's 1Password Connect server.

From this checkout, bootstrap the shared Mise directory with a temporary chezmoi,
then install the global tools it declares:

```sh
mise exec chezmoi@latest -- chezmoi --source "$PWD" apply "$HOME/.config/mise"
mise install
mise run setup
chezmoi apply "$HOME/.config/services"
```

On first setup, start the Compose projects from their directories under
`~/.config/services`:

- macOS: run `docker compose up -d` in `browserless` and `onepassword-connect`.
- Linux: run `sudo podman-compose up -d` in `onepassword-connect`.

Run `chezmoi apply` to finish setup and apply future updates.

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
