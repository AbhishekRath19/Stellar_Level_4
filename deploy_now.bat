@echo off
echo ==========================================
echo PREDIX PROTOCOL - AUTOMATED DEPLOYER
echo ==========================================

echo.
echo [1/3] Building contracts...
cd contracts_soroban\token
cargo build --target wasm32-unknown-unknown --release
cd ..\prediction_market
cargo build --target wasm32-unknown-unknown --release
cd ..\..

echo.
echo [2/3] Deploying Token...
stellar contract deploy --wasm contracts_soroban\target\wasm32-unknown-unknown\release\market_token.wasm --source-account %1 --network testnet > token_id.txt
set /p TOKEN_ID=<token_id.txt
echo Token ID: %TOKEN_ID%

echo.
echo [3/3] Deploying Market...
stellar contract deploy --wasm contracts_soroban\target\wasm32-unknown-unknown\release\prediction_market.wasm --source-account %1 --network testnet > market_id.txt
set /p MARKET_ID=<market_id.txt
echo Market ID: %MARKET_ID%

echo.
echo ==========================================
echo DEPLOYMENT COMPLETE!
echo ==========================================
echo Token: %TOKEN_ID%
echo Market: %MARKET_ID%
echo.
echo PLEASE PASTE THESE TWO IDS INTO CHAT TO FINISH THE FIX.
pause
