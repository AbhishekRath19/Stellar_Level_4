#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, Symbol, Vec, Map, panic_with_error};

// Define the token client interface for inter-contract calls
mod token {
    soroban_sdk::contractimport!(file = "../token/target/wasm32-unknown-unknown/release/market_token.wasm");
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Market {
    pub creator: Address,
    pub question: Symbol,
    pub options: Vec<Symbol>,
    pub close_time: u64,
    pub resolved: bool,
    pub winning_option: u32,
    pub total_bets: Vec<i128>,
}

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {
    /// Initializes the contract with the MarketToken address.
    pub fn initialize(e: Env, token_address: Address) {
        if e.storage().instance().has(&symbol_short!("token")) {
            panic!("Already initialized");
        }
        e.storage().instance().set(&symbol_short!("token"), &token_address);
    }

    pub fn create_market(
        e: Env,
        creator: Address,
        question: Symbol,
        options: Vec<Symbol>,
        close_time: u64,
    ) -> u32 {
        creator.require_auth();
        assert!(options.len() >= 2, "At least 2 options required");
        assert!(close_time > e.ledger().timestamp(), "Close time must be in future");
        
        let mut total_bets = Vec::new(&e);
        for _ in 0..options.len() {
            total_bets.push_back(0);
        }

        let market = Market {
            creator,
            question,
            options: options.clone(),
            close_time,
            resolved: false,
            winning_option: 0,
            total_bets,
        };

        e.storage().instance().set(&market_id, &market);
        e.storage().instance().set(&symbol_short!("count"), &(market_id + 1));
        
        // Emit Event for Real-time Streaming
        e.events().publish(
            (symbol_short!("m_create"), market_id),
            (creator, question, options)
        );

        market_id
    }

    pub fn place_bet(e: Env, user: Address, market_id: u32, option: u32, amount: i128) {
        user.require_auth();
        
        let mut market = e.storage().instance().get::<_, Market>(&market_id).expect("Market not found");
        assert!(!market.resolved, "Market already resolved");
        assert!(e.ledger().timestamp() < market.close_time, "Market closed");

        // 1. Inter-contract call: Transfer MTK from user to this contract
        let token_addr = e.storage().instance().get::<_, Address>(&symbol_short!("token")).expect("Token not set");
        let token_client = token::Client::new(&e, &token_addr);
        
        // The user must have approved this contract to spend their tokens
        token_client.transfer_from(&e.current_contract_address(), &user, &e.current_contract_address(), &amount);

        // 2. Update market state
        let mut total_bets = market.total_bets;
        let current_bet = total_bets.get(option).unwrap();
        total_bets.set(option, current_bet + amount);
        
        market.total_bets = total_bets;
        e.storage().instance().set(&market_id, &market);

        // 3. Update user position
        let user_bet_key = (symbol_short!("ubet"), market_id, user.clone(), option);
        let current_user_bet: i128 = e.storage().persistent().get(&user_bet_key).unwrap_or(0);
        e.storage().persistent().set(&user_bet_key, &(current_user_bet + amount));

        // 4. Emit Event
        e.events().publish(
            (symbol_short!("bet"), market_id),
            (user, option, amount)
        );
    }

    pub fn get_user_bet(e: Env, market_id: u32, user: Address, option: u32) -> i128 {
        let user_bet_key = (symbol_short!("ubet"), market_id, user, option);
        e.storage().persistent().get(&user_bet_key).unwrap_or(0)
    }

    pub fn resolve_market(e: Env, market_id: u32, winning_option: u32) {
        // In a real app, only an authorized oracle or admin can call this
        // For this level, we'll allow the creator to resolve for simplicity
        let mut market = e.storage().instance().get::<_, Market>(&market_id).expect("Market not found");
        market.creator.require_auth();
        
        assert!(!market.resolved, "Already resolved");
        
        market.resolved = true;
        market.winning_option = winning_option;
        e.storage().instance().set(&market_id, &market);

        // Emit Event
        e.events().publish(
            (symbol_short!("resolve"), market_id),
            winning_option
        );
    }

    pub fn get_market(e: Env, market_id: u32) -> Market {
        e.storage().instance().get::<_, Market>(&market_id).expect("Market not found")
    }

    pub fn get_count(e: Env) -> u32 {
        e.storage().instance().get::<_, u32>(&symbol_short!("count")).unwrap_or(0)
    }
}
