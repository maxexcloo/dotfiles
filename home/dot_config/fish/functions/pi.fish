function pi --wraps pi
    set -lx BIFROST_PI_KEY (fnox get BIFROST_PI_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --allow-cwd --profile pi -- sh -c 'OP_CONNECT_HOST=$CONNECT_HOST OP_CONNECT_TOKEN=$CONNECT_TOKEN exec "$@"' sh pi $argv
end
