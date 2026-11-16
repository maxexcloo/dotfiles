# Dotfiles

- Keep workstation preferences in the mirrored chezmoi source tree under `home/`.
- Secrets that only local tools read belong in the 1Password Automation vault, through the `automation` fnox provider.
- Changing an agent hook's command drops Codex's trust in it; ask the user to re-trust it in Codex's `/hooks` on each host.
- Keep credential-bearing targets private and merge their preferences with native chezmoi modify templates.
- Keep shared agent instructions and self-written skills in `../agents`. Manage their workstation links and skill discovery configuration here. Install upstream skills through native chezmoi externals; keep personal rules in the Agents repository rather than patching upstream packages.
- Other repositories consume the shared Mise tasks and `.github/actions/mise` at `@main` (an accepted risk, as the owner controls every consumer). Check their `.mise.toml` and workflows before changing or removing shared behaviour; keep changes backwards compatible.
- Every tool a CI job runs must be in its `with.tools` or declared by the repository with `project-tools: true`.
- Linux hosts apply this source too: limit macOS-only targets with `.chezmoiignore` or `.chezmoi.os` blocks.
- Keep personal user application runtimes here: native systemd user units and
  rootless Quadlets on Linux, workstation Compose under `.config/services` where
  needed, including user HTTPS proxies. Keep runtime ports and image versions
  here. Homelab owns infrastructure, public hostnames and non-secret host credential
  references; derive host membership and URLs from its public inventory at chezmoi
  apply, without a second inventory.
- Preserve Connect’s existing rootful Podman secret and volume on Linux; keep the `onepassword-connect` Compose project, named volume and OrbStack hostname on macOS. A runtime migration must not recreate credentials or data.
- Keep application-managed hooks, caches, history, account state and generated host inventories outside this repository.
- Preserve application destination paths when changing source attributes or templates.
- Use chezmoi's normal conflict handling for apply; do not force routine updates.
