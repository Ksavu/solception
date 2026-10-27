//! Solception — a launchpad that launches launchpads.
//!
//! Layer 0  Platform      Solception itself. Charges launchpad creation fees and
//!                        takes a share of every fee on every launchpad.
//! Layer 1  Launchpad     Anyone can spin one up with its own branding, fees and
//!                        curve settings, and earns from every token launched on it.
//! Layer 2  Bonding curve One per token. Fixed supply, constant-product virtual
//!                        reserves, graduates to a DEX when the curve sells out.
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;

use instructions::*;
use state::FeeBucket;

declare_id!("6uQVicnMFGPnk12qUFkikhqzyfnhpk7vNDXuT8pUhhhz");

#[program]
pub mod solception {
    use super::*;

    // ---- Layer 0: platform ----

    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        params: InitializePlatformParams,
    ) -> Result<()> {
        instructions::platform::initialize_platform(ctx, params)
    }

    pub fn update_platform(ctx: Context<UpdatePlatform>, params: UpdatePlatformParams) -> Result<()> {
        instructions::platform::update_platform(ctx, params)
    }

    // ---- Layer 1: launchpads ----

    pub fn create_launchpad(ctx: Context<CreateLaunchpad>, params: CreateLaunchpadParams) -> Result<()> {
        instructions::launchpad::create_launchpad(ctx, params)
    }

    pub fn update_launchpad(ctx: Context<UpdateLaunchpad>, params: UpdateLaunchpadParams) -> Result<()> {
        instructions::launchpad::update_launchpad(ctx, params)
    }

    // ---- Layer 2: tokens ----

    pub fn launch_token(ctx: Context<LaunchToken>, params: LaunchTokenParams) -> Result<()> {
        instructions::launch_token::launch_token(ctx, params)
    }

    pub fn buy(ctx: Context<Swap>, max_sol_cost: u64, min_tokens_out: u64) -> Result<()> {
        instructions::trade::buy(ctx, max_sol_cost, min_tokens_out)
    }

    pub fn sell(ctx: Context<Swap>, token_amount: u64, min_sol_out: u64) -> Result<()> {
        instructions::trade::sell(ctx, token_amount, min_sol_out)
    }

    // ---- Fees & graduation ----

    pub fn claim_fees(ctx: Context<ClaimFees>, bucket: FeeBucket) -> Result<()> {
        instructions::fees::claim_fees(ctx, bucket)
    }

    pub fn withdraw_for_migration(ctx: Context<WithdrawForMigration>) -> Result<()> {
        instructions::migrate::withdraw_for_migration(ctx)
    }
}
