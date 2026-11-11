function claude --wraps claude
    nono run --allow-cwd --allow (git rev-parse --path-format=absolute --git-common-dir 2>/dev/null; or pwd) --profile claude -- claude $argv
end
