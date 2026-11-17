# Dotfiles

My macOS workstation preferences, managed by [chezmoi](https://www.chezmoi.io/)
and installed through Mise; the same source sets up agents on Linux. Shared agent
instructions and my own skills live in the separate
[Agents repository](https://github.com/maxexcloo/agents).

## Usage

On Apple Silicon Macs, install [standalone Mise](https://mise.jdx.dev/installing-mise.html#macos)
and add `~/.local/bin` to `PATH`. Sign in to the Mac App Store for app
installation and enable 1Password's desktop integration for SSH authentication.
Linux hosts get Mise from their image.

Fnox signs in to 1Password through the desktop app on macOS. On Linux, keep a
service account token as `OP_SERVICE_ACCOUNT_TOKEN` in the unmanaged
`~/.config/fnox/service-account.toml`. Projects that select the `connect` fnox
profile use this machine's 1Password Connect server.

From this checkout, bootstrap the shared Mise directory with a temporary chezmoi,
then install the global tools and workstation packages it declares:

```sh
mkdir -p "$HOME/.config"
mise exec chezmoi@latest -- chezmoi --source "$PWD" apply "$HOME/.config/mise"
mise install
mise bootstrap packages apply
mise run setup
chezmoi apply "$HOME/.config/services"
```

On macOS, run `docker compose up -d` in `browserless` and `onepassword-connect`
under `~/.config/services`. On Mercury, install the rendered Connect Quadlets
from `~/.config/services/onepassword-connect` into `/etc/containers/systemd`,
reload systemd and start `onepassword-connect-api` and `onepassword-connect-sync`.

Run `chezmoi apply` to finish setup and apply future updates. On macOS, run
`mise bootstrap packages upgrade` to update workstation packages.

When migrating an existing Mac, use a shell outside `/opt/homebrew` during
the cutover if Fish is your login shell. Mise leaves
[Homebrew-owned casks](https://mise.jdx.dev/bootstrap/packages/brew-cask.html#casks-installed-by-homebrew)
under Brew's control. Uninstall those casks while retaining their app data,
then retire Homebrew before applying the Mise packages to the shared prefix.
Move any existing direct-download app bundles out of `/Applications` before
applying their pins. Remove the old `~/.Brewfile` after the cutover.

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
