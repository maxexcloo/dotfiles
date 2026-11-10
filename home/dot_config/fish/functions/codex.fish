function codex --wraps codex
    set -lx BIFROST_CODEX_KEY (fnox get BIFROST_CODEX_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --profile codex --allow-cwd -- codex $argv
end
