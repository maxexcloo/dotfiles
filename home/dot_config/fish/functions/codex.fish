function codex --wraps codex
    set -lx BIFROST_CODEX_KEY (fnox get BIFROST_CODEX_KEY)
    command codex $argv
end
