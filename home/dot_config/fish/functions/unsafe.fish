function unsafe --description 'Run an agent outside its sandbox' --wraps run-agent
    set -lx SANDBOX 0
    run-agent $argv
end
