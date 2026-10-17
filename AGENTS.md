# Dotfiles

- Keep workstation preferences in the mirrored chezmoi source tree under `home/`.
- Keep only 1Password references in source; never commit or print resolved credentials.
- Keep credential-bearing targets private and merge their preferences with native chezmoi modify templates.
- Keep shared agent instructions and self-written skills in `../agents`. Manage their workstation links and skill discovery configuration here. Install upstream skills through native chezmoi externals; keep personal rules in the Agents repository rather than patching upstream packages.
- Keep application-managed hooks, caches, history, account state and generated host inventories outside this repository.
- Preserve application destination paths and unrelated local state when changing source attributes or templates.
- Run `mise run check` after changes. Use chezmoi's normal conflict handling for apply; do not force routine updates.
