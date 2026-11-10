function run-agent --argument-names agent
    set -lx BIFROST_(string upper $agent)_KEY (fnox get BIFROST_(string upper $agent)_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    if test "$SANDBOX" = 0
        command $agent $argv[2..]
    else
        nono run --allow-cwd --profile $agent -- sh -c 'OP_CONNECT_HOST=$CONNECT_HOST OP_CONNECT_TOKEN=$CONNECT_TOKEN exec "$@"' sh $agent $argv[2..]
    end
end
