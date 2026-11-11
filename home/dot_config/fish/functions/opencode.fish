function opencode --wraps opencode
    nono run --allow-cwd --allow (git rev-parse --path-format=absolute --git-common-dir 2>/dev/null; or pwd) --profile opencode -- opencode $argv
end
