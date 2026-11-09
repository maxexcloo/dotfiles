function claude --wraps claude
    set -lx BIFROST_CLAUDE_KEY (fnox get BIFROST_CLAUDE_KEY)
    command claude $argv
end
