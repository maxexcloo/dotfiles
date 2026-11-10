function claude --wraps claude
    set -lx BIFROST_CLAUDE_KEY (fnox get BIFROST_CLAUDE_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --allow-cwd --profile claude -- sh -c 'OP_CONNECT_HOST=$CONNECT_HOST OP_CONNECT_TOKEN=$CONNECT_TOKEN exec "$@"' sh claude $argv
end
