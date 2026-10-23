fish_add_path /opt/homebrew/bin
fish_add_path $HOME/.local/bin
set -gx XDG_CACHE_HOME $HOME/Library/Caches
test -f $HOME/.orbstack/shell/init2.fish; and source $HOME/.orbstack/shell/init2.fish

set -gx EDITOR nano
set -gx FZF_CTRL_R_COMMAND ""
set -gx FZF_CTRL_T_COMMAND "fd --exclude .git --hidden --type f"
set -gx FZF_CTRL_T_OPTS "--preview 'bat --color=always -- {}'"
set -gx FZF_DEFAULT_COMMAND $FZF_CTRL_T_COMMAND
set -gx LESSHISTFILE /dev/null
set -gx MANPAGER "sh -c 'col -bx | bat -l man -p'"
set -gx SSH_AUTH_SOCK "$HOME/Library/Group Containers/2BUA8C4S2C.com.1password/t/agent.sock"

if status is-interactive
    set -g fish_greeting ""
    set -g fish_history ""

    atuin init fish | source
    fzf --fish | source
    mise activate fish | source
    zoxide init fish --cmd cd | source

    # Codex and opencode read their Bifrost MCP keys only from the environment.
    set -gx BIFROST_CODEX_KEY (fnox get BIFROST_CODEX_KEY)
    set -gx BIFROST_OPENCODE_KEY (fnox get BIFROST_OPENCODE_KEY)

    abbr -a bash 'env HISTFILE=/dev/null bash'
    abbr -a du dust
    abbr -a find fd
    abbr -a grep rg
    alias la='eza -la --group-directories-first --icons=auto'
    alias ll='eza -l --group-directories-first --icons=auto'
    alias ls='eza --group-directories-first --icons=auto'
    abbr -a sh 'env HISTFILE=/dev/null sh'
    abbr -a top btop
    alias tree='eza --icons=auto --tree'
else
    mise activate fish --shims | source
end
