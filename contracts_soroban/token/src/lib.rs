#![no_std]
use soroban_sdk::{contract, contractimpl, Address, Env, String, symbol_short, Symbol};

#[contract]
pub struct MarketToken;

#[contractimpl]
impl MarketToken {
    pub fn initialize(e: Env, admin: Address, decimal: u32, name: String, symbol: String) {
        if e.storage().instance().has(&symbol_short!("admin")) {
            panic!("already initialized");
        }
        e.storage().instance().set(&symbol_short!("admin"), &admin);
        e.storage().instance().set(&symbol_short!("decimal"), &decimal);
        e.storage().instance().set(&symbol_short!("name"), &name);
        e.storage().instance().set(&symbol_short!("symbol"), &symbol);
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        // In a production app, this would be admin-only.
        // For Level 4 Testnet, we'll allow anyone to mint for testing purposes.
        // admin.require_auth(); 
        
        let mut balance: i128 = e.storage().persistent().get(&to).unwrap_or(0);
        balance += amount;
        e.storage().persistent().set(&to, &balance);
    }

    pub fn balance(e: Env, id: Address) -> i128 {
        e.storage().persistent().get(&id).unwrap_or(0)
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        
        let mut from_balance: i128 = e.storage().persistent().get(&from).unwrap_or(0);
        let mut to_balance: i128 = e.storage().persistent().get(&to).unwrap_or(0);

        assert!(from_balance >= amount, "insufficient balance");

        from_balance -= amount;
        to_balance += amount;

        e.storage().persistent().set(&from, &from_balance);
        e.storage().persistent().set(&to, &to_balance);
    }

    pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        
        let allowance_key = (symbol_short!("allow"), from.clone(), spender.clone());
        let mut allowance: i128 = e.storage().temporary().get(&allowance_key).unwrap_or(0);
        
        assert!(allowance >= amount, "insufficient allowance");

        let mut from_balance: i128 = e.storage().persistent().get(&from).unwrap_or(0);
        let mut to_balance: i128 = e.storage().persistent().get(&to).unwrap_or(0);

        assert!(from_balance >= amount, "insufficient balance");

        from_balance -= amount;
        to_balance += amount;
        allowance -= amount;

        e.storage().persistent().set(&from, &from_balance);
        e.storage().persistent().set(&to, &to_balance);
        e.storage().temporary().set(&allowance_key, &allowance);
    }

    pub fn approve(e: Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        let allowance_key = (symbol_short!("allow"), from, spender);
        e.storage().temporary().set(&allowance_key, &amount);
    }
}
