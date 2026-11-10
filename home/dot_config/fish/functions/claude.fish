function claude --wraps claude
    set -lx BIFROST_CLAUDE_KEY (fnox get BIFROST_CLAUDE_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --profile claude --allow-cwd -- claude $argv
end
