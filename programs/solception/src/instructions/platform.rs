use anchor_lang::prelude::*;

use crate::errors::SolceptionError;
use crate::events::PlatformInitialized;
use crate::math::BPS_DENOMINATOR;
use crate::program::Solception;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializePlatformParams {
    pub treasury: Pubkey,
    pub migration_authority: Pubkey,
    pub launchpad_creation_fee: u64,
    pub platform_fee_share_bps: u16,
    pub max_trade_fee_bps: u16,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdatePlatformParams {
    pub new_authority: Option<Pubkey>,
    pub treasury: Option<Pubkey>,
    pub migration_authority: Option<Pubkey>,
    pub launchpad_creation_fee: Option<u64>,
    pub platform_fee_share_bps: Option<u16>,
    pub max_trade_fee_bps: Option<u16>,
    pub paused: Option<bool>,
}

fn validate_platform_bps(share: u16, max_fee: u16) -> Result<()> {
    require!(share as u64 <= BPS_DENOMINATOR, SolceptionError::InvalidBps);
    require!(max_fee <= ABSOLUTE_MAX_TRADE_FEE_BPS, SolceptionError::TradeFeeTooHigh);
    Ok(())
}

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    /// Must be the program's upgrade authority, so nobody can front-run init.
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Platform::INIT_SPACE,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform: Account<'info, Platform>,

    #[account(constraint = program.programdata_address()? == Some(program_data.key()))]
    pub program: Program<'info, Solception>,

    #[account(
        constraint = program_data.upgrade_authority_address == Some(authority.key())
            @ SolceptionError::Unauthorized
    )]
    pub program_data: Account<'info, ProgramData>,

    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    params: InitializePlatformParams,
) -> Result<()> {
    validate_platform_bps(params.platform_fee_share_bps, params.max_trade_fee_bps)?;

    let platform = &mut ctx.accounts.platform;
    platform.authority = ctx.accounts.authority.key();
    platform.treasury = params.treasury;
    platform.migration_authority = params.migration_authority;
    platform.launchpad_creation_fee = params.launchpad_creation_fee;
    platform.platform_fee_share_bps = params.platform_fee_share_bps;
    platform.max_trade_fee_bps = params.max_trade_fee_bps;
    platform.launchpad_count = 0;
    platform.paused = false;
    platform.bump = ctx.bumps.platform;

    emit!(PlatformInitialized {
        authority: platform.authority,
        treasury: platform.treasury,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct UpdatePlatform<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = authority @ SolceptionError::Unauthorized
    )]
    pub platform: Account<'info, Platform>,
}

pub fn update_platform(ctx: Context<UpdatePlatform>, params: UpdatePlatformParams) -> Result<()> {
    let p = &mut ctx.accounts.platform;
    if let Some(v) = params.new_authority {
        p.authority = v;
    }
    if let Some(v) = params.treasury {
        p.treasury = v;
    }
    if let Some(v) = params.migration_authority {
        p.migration_authority = v;
    }
    if let Some(v) = params.launchpad_creation_fee {
        p.launchpad_creation_fee = v;
    }
    if let Some(v) = params.platform_fee_share_bps {
        p.platform_fee_share_bps = v;
    }
    if let Some(v) = params.max_trade_fee_bps {
        p.max_trade_fee_bps = v;
    }
    if let Some(v) = params.paused {
        p.paused = v;
    }
    validate_platform_bps(p.platform_fee_share_bps, p.max_trade_fee_bps)?;
    Ok(())
}
