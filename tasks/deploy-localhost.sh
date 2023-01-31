#!/bin/sh

NETWORK="localhost"
RPC_URL="http://localhost:8545"
CHAIN_ID="1337"

MANAGER=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
OWNER=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
MANAGER_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
OWNER_PK=0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

FACTORY=0x19C9770a0cfbf1f3A21E6611f0682f2bFA53c672

# Assets and pools
CRV_TRICRYPTO2=0xd51a44d3fae010294c616388b506acda1bfaae46
CRV_3POOL=0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7
USDT=0xdAC17F958D2ee523a2206206994597C13D831ec7
DAI=0x6B175474E89094C44Da98b954EedeAC495271d0F


# Echo test addresses
echo "Manager account:     $MANAGER" 
echo "Shareholder account: $OWNER"
echo ""

# Clone the vault and extract vault address from logs
echo "Deploying vault contract."
VAULT=`cast send --rpc-url http://localhost:8545 --private-key $MANAGER_PK $FACTORY --json \
    "create(address,address,string,string) returns (address)" \
    $MANAGER $DAI "UI Testing Vault" "VAULT" \
    | jq .logs[1].topics[1]` 
VAULT=`echo $VAULT | sed -r 's/^".+(.{40})"$/0x\1/'`

echo " => $VAULT"
echo ""

JSON_OUTPUT=$(jq --null-input --arg vault "$VAULT" \
    --arg manager "$MANAGER" \
    --arg shareholder "$OWNER" \
    '{"vault": $vault, manager: $manager, shareholder: $shareholder}')

echo $JSON_OUTPUT > .dev-state/deployment.json

## Swap 10 ETH to any amount of USDT
echo "Swapping 10 ETH to USDT via Curve Tricrypto2."
cast send --from $MANAGER --rpc-url $RPC_URL --value 10000000000000000000 $CRV_TRICRYPTO2  "exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy, bool use_eth)" "2" "0"  "10000000000000000000" "1000000" "true" >/dev/null
BALANCE_USDT=`cast call $USDT "balanceOf(address)" $MANAGER`
BALANCE_USDT=`cast td $BALANCE_USDT`
BALANCE_USDT_DISPLAY=`expr $BALANCE_USDT / 1000000`

## Approvals 
cast send --from $MANAGER $USDT "approve(address,uint256)" $CRV_3POOL 0 >/dev/null
cast send --from $MANAGER $USDT "approve(address,uint256)" $CRV_3POOL $BALANCE_USDT >/dev/null

## Swap USDT to DAI
echo "Swapping $BALANCE_USDT_DISPLAY USDT to DAI via Curve 3Pool."
cast send --from $MANAGER $CRV_3POOL "exchange(int128 i, int128 j, uint256 dx, uint256 min_dy)" "2" "0" $BALANCE_USDT 1 >/dev/null
BALANCE_DAI=`cast call $DAI "balanceOf(address)" $MANAGER`
BALANCE_DAI=`cast td $BALANCE_DAI`
BALANCE_DAI=`cast 2un $BALANCE_DAI ether`
echo "DAI Balance in manager account: $BALANCE_DAI"


TRANSFER_DAI=`echo $BALANCE_DAI | sed -r 's/\.[0-9]+//'`
TRANSFER_DAI_DISPLAY=`expr $TRANSFER_DAI / 3`
TRANSFER_DAI=`cast tw $TRANSFER_DAI_DISPLAY`

echo "Transfering $TRANSFER_DAI_DISPLAY DAI to owner."
cast send --from $MANAGER $DAI "transfer(address,uint256)" $OWNER $TRANSFER_DAI >/dev/null



exit 0
