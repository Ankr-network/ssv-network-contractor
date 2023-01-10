#!/usr/bin/env bash

SCRIPT_PATH=$(dirname "$0")
echo "ABI compiler started at $SCRIPT_PATH"
mkdir "$SCRIPT_PATH/src/abi"
source .env
echo "Downloading SSV contracts..."
wget -q -O "$SCRIPT_PATH/src/abi/SSVNetwork.json" "https://api-goerli.etherscan.io/api?module=contract&action=getabi&address=$SSV_NETWORK_IMPL_ADDRESS&apikey=$ETHERSCAN_KEY&format=raw"
wget -q -O "$SCRIPT_PATH/src/abi/SSVToken.json" "https://api-goerli.etherscan.io/api?module=contract&action=getabi&address=$SSV_TOKEN_IMPL_ADDRESS&apikey=$ETHERSCAN_KEY&format=raw"

npx typechain --target=web3-v1 --out-dir="$SCRIPT_PATH/src/generated" "$SCRIPT_PATH/src/abi/*.json" --show-stack-traces

rm -rf "$SCRIPT_PATH/src/abi"

echo "DONE"

