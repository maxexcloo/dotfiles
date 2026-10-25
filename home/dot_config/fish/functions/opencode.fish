# OpenCode reads its Bifrost key only from the environment; fetch it at launch, not per shell.
function opencode --wraps opencode
    set -lx BIFROST_OPENCODE_KEY (fnox get BIFROST_OPENCODE_KEY)
    command opencode $argv
end
