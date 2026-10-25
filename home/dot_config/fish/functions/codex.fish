# Codex reads its Bifrost key only from the environment; fetch it at launch, not per shell.
function codex --wraps codex
    set -lx BIFROST_CODEX_KEY (fnox get BIFROST_CODEX_KEY)
    command codex $argv
end
