function opencode --wraps opencode
    set -lx BIFROST_OPENCODE_KEY (fnox get BIFROST_OPENCODE_KEY)
    command opencode $argv
end
