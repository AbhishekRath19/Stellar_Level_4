.PHONY: build test clean

build:
	cd contracts_soroban/token && cargo build --target wasm32-unknown-unknown --release
	cd contracts_soroban/prediction_market && cargo build --target wasm32-unknown-unknown --release

test:
	cd contracts_soroban/token && cargo test
	cd contracts_soroban/prediction_market && cargo test

clean:
	cd contracts_soroban/token && cargo clean
	cd contracts_soroban/prediction_market && cargo clean
	rm -rf contracts_soroban/target
