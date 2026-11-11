function codex --wraps codex
    nono run --allow-cwd --allow (git rev-parse --path-format=absolute --git-common-dir 2>/dev/null; or pwd) --profile codex -- codex $argv
end
