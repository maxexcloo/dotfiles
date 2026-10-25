function pi --wraps pi
    set -lx BIFROST_PI_KEY (fnox get BIFROST_PI_KEY)
    command pi $argv
end
