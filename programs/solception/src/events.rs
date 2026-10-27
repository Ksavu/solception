use anchor_lang::prelude::*;

use crate::state::FeeBucket;

#[event]
pub struct PlatformInitialized {
    pub authority: Pubkey,
    pub treasury: Pubkey,
}

#[event]
pub struct LaunchpadCreated {
    pub launchpad: Pubkey,
    pub id: u64,
    pub owner: Pubkey,
    pub name: String,
    pub trade_fee_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct LaunchpadUpdated {
    pub launchpad: Pubkey,
    pub owner: Pubkey,
}

#[event]
pub struct TokenLaunched {
    pub launchpad: Pubkey,
    pub mint: Pubkey,
    pub bonding_curve: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub total_supply: u64,
    pub timestamp: i64,
}

#[event]
pub struct Trade {
    pub launchpad: Pubkey,
    pub mint: Pubkey,
    pub user: Pubkey,
    pub is_buy: bool,
    /// Net SOL that moved in/out of the curve reserves (excl. fee).
    pub sol_amount: u64,
    pub token_amount: u64,
    pub fee: u64,
    pub virtual_sol_reserves: u64,
    pub virtual_token_reserves: u64,
    pub real_sol_reserves: u64,
    pub real_token_reserves: u64,
    pub timestamp: i64,
}

#[event]
pub struct CurveCompleted {
    pub launchpad: Pubkey,
    pub mint: Pubkey,
    pub real_sol_reserves: u64,
    pub timestamp: i64,
}

#[event]
pub struct FeesClaimed {
    pub mint: Pubkey,
    pub bucket: FeeBucket,
    pub recipient: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LiquidityWithdrawnForMigration {
    pub launchpad: Pubkey,
    pub mint: Pubkey,
    pub sol_amount: u64,
    pub token_amount: u64,
    pub migration_authority: Pubkey,
    pub timestamp: i64,
}
