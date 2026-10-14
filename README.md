# Dotfiles

Workstation configuration for macOS. Active application paths link to this checkout;
edit the files here to change preferences. Shared agent instructions, skills and
skill discovery remain in the separate [Agents repository](https://github.com/maxexcloo/agents).

## Configuration

`config/` owns Atuin, Fish, Ghostty, Git, Hammerspoon, Mise, OpenCode display,
SSH client and Visual Studio Code preferences. `links.json` maps each source to
its existing path under the user's home directory.

Credential-bearing Codex, Antigravity and OpenCode configurations live in ignored
`private/` files with mode `600`. Their active paths remain symlinks. Secret-free
templates in `templates/` document their structure; these are examples, not active
configuration. Keep authentication material in 1Password and resolve it locally.
Do not commit resolved values. Template placeholders are not working credentials.
Refresh templates separately when changing the corresponding private preferences.

Orca-managed Codex hooks, accounts, caches, history, SSH host inventories and
application databases remain application-managed. Git's existing signing settings
and SSH's existing agent configuration are preserved.

## Usage

From this directory:

```sh
mise run check
mise run link
```

The link task checks every destination before creating links. It refuses to
overwrite existing files. On a new workstation, provision the three private files
from their templates and 1Password first; review existing destination files and
move them aside before linking. Install the required applications and globally
managed Mise tools separately.

## Global Tasks

Run these tasks from the repository root. The global Mise configuration owns their
implementation; repository Updatecli policies and Prek hooks remain local.

| Task | Purpose |
| --- | --- |
| `dependencies:check` | Preview local Updatecli changes. |
| `dependencies:update --labels <labels>` | Apply reviewed updates, optionally selecting policy groups. |
| `hooks:check` | Run all configured Prek hooks. |
| `hooks:install` | Install the repository's configured Git hooks. |

Dependency tasks resolve GitHub authentication inside their child process. The AI
repository adds its Python requirements and lockfile refresh after a successful
shared update. The hidden `dependencies:apply` task holds that shared implementation.
Project `check` and `setup` tasks retain direct Prek commands where needed for fresh
checkouts and CI without this personal configuration. Install this global config
on any workstation that should run the shared dependency tasks.

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
