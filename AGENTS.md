# Dotfiles

- Keep workstation preferences in `config/` and secret-free examples in `templates/`.
- Keep credentials in ignored `private/` files. Never stage their contents or print them.
- Keep shared agent instructions, skills and skill discovery in `../agents`.
- Keep application-managed hooks, caches, history, account state and generated host inventories outside this repository.
- Preserve configuration behaviour and the paths in `links.json`; change producers and consumers together.
- Run `mise run check` after changes. Linking must refuse to overwrite existing destinations.
