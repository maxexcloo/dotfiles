function run-agent --argument-names agent
    set -lx BIFROST_(string upper $agent)_KEY (fnox get BIFROST_(string upper $agent)_KEY); or return
    set -lx GH_TOKEN (fnox get GH_TOKEN); or return
    if test "$SANDBOX" = 0
        command $agent $argv[2..]
    else
        nono run --allow-cwd --profile $agent -- $agent $argv[2..]
    end
end
