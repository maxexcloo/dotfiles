function opencode --wraps opencode
    set -lx BIFROST_OPENCODE_KEY (fnox get BIFROST_OPENCODE_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --profile opencode --allow-cwd -- opencode $argv
end
