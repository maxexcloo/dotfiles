function claude --wraps claude
    set -lx BIFROST_CLAUDE_KEY (fnox get BIFROST_CLAUDE_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --allow-cwd --profile claude -- claude $argv
end
