#!/usr/bin/env bash

SCRIPT_PATH=$(dirname "$0")
echo "ABI compiler started at $SCRIPT_PATH"

npx typechain --target=web3-v1 --out-dir="$SCRIPT_PATH/src/generated" "$SCRIPT_PATH/src/abi/*.json"

echo "DONE"

