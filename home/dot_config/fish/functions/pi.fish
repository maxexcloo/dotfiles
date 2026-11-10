function pi --wraps pi
    set -lx BIFROST_PI_KEY (fnox get BIFROST_PI_KEY)
    set -lx GH_TOKEN (fnox get GH_TOKEN)
    nono run --profile pi --allow-cwd -- pi $argv
end
