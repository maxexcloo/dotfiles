function codex --wraps codex
    set -lx BIFROST_CODEX_KEY (fnox get BIFROST_CODEX_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --allow-cwd --profile codex -- sh -c 'OP_CONNECT_HOST=$CONNECT_HOST OP_CONNECT_TOKEN=$CONNECT_TOKEN exec "$@"' sh codex $argv
end
