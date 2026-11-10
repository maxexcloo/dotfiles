function opencode --wraps opencode
    set -lx BIFROST_OPENCODE_KEY (fnox get BIFROST_OPENCODE_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --allow-cwd --profile opencode -- sh -c 'OP_CONNECT_HOST=$CONNECT_HOST OP_CONNECT_TOKEN=$CONNECT_TOKEN exec "$@"' sh opencode $argv
end
