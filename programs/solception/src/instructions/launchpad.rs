use anchor_lang::prelude::*;
use anchor_lang::system_program;

use crate::errors::SolceptionError;
use crate::events::{LaunchpadCreated, LaunchpadUpdated};
use crate::math::BPS_DENOMINATOR;
use crate::state::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateLaunchpadParams {
    pub name: String,
    pub uri: String,
    pub fee_recipient: Pubkey,
    pub trade_fee_bps: u16,
    pub creator_fee_share_bps: u16,
    pub token_launch_fee: u64,
    pub curve: CurveConfig,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdateLaunchpadParams {
    pub new_owner: Option<Pubkey>,
    pub fee_recipient: Option<Pubkey>,
    pub uri: Option<String>,
    pub trade_fee_bps: Option<u16>,
    pub creator_fee_share_bps: Option<u16>,
    pub token_launch_fee: Option<u64>,
    /// Applies to tokens launched after the update only.
    pub curve: Option<CurveConfig>,
    pub paused: Option<bool>,
}

pub fn validate_curve(c: &CurveConfig) -> Result<()> {
    require!(c.initial_virtual_sol > 0, SolceptionError::InvalidCurveConfig);
    require!(c.curve_token_supply > 0, SolceptionError::InvalidCurveConfig);
    require!(c.lp_token_reserve > 0, SolceptionError::InvalidCurveConfig);
    // Virtual tokens must exceed what the curve can sell, or the last buy divides by zero.
    require!(
        c.initial_virtual_tokens > c.curve_token_supply,
        SolceptionError::InvalidCurveConfig
    );
    c.curve_token_supply
        .checked_add(c.lp_token_reserve)
        .ok_or(SolceptionError::InvalidCurveConfig)?;
    // k must fit in u128 (always true for u64*u64) and the full-curve cost must fit in u64.
    crate::math::sol_in_for_tokens(
        c.initial_virtual_sol,
        c.initial_virtual_tokens,
        c.curve_token_supply,
    )
    .ok_or(SolceptionError::InvalidCurveConfig)?;
    Ok(())
}

fn validate_fees(platform: &Platform, trade_fee_bps: u16, creator_share_bps: u16) -> Result<()> {
    require!(
        trade_fee_bps <= platform.max_trade_fee_bps,
        SolceptionError::TradeFeeTooHigh
    );
    require!(
        creator_share_bps as u64 <= BPS_DENOMINATOR,
        SolceptionError::InvalidBps
    );
    Ok(())
}

#[derive(Accounts)]
pub struct CreateLaunchpad<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(mut, seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Box<Account<'info, Platform>>,

    /// CHECK: address-constrained to the platform treasury; only receives lamports.
    #[account(mut, address = platform.treasury)]
    pub treasury: UncheckedAccount<'info>,

    #[account(
        init,
        payer = owner,
        space = 8 + Launchpad::INIT_SPACE,
        seeds = [LAUNCHPAD_SEED, &platform.launchpad_count.to_le_bytes()],
        bump
    )]
    pub launchpad: Box<Account<'info, Launchpad>>,

    pub system_program: Program<'info, System>,
}

pub fn create_launchpad(ctx: Context<CreateLaunchpad>, params: CreateLaunchpadParams) -> Result<()> {
    let platform = &ctx.accounts.platform;
    require!(!platform.paused, SolceptionError::PlatformPaused);
    require!(!params.name.trim().is_empty(), SolceptionError::EmptyName);
    require!(
        params.name.len() <= MAX_LAUNCHPAD_NAME_LEN && params.uri.len() <= MAX_URI_LEN,
        SolceptionError::StringTooLong
    );
    validate_fees(platform, params.trade_fee_bps, params.creator_fee_share_bps)?;
    validate_curve(&params.curve)?;

    // Layer-0 fee: creating a launchpad pays the Solception treasury.
    if platform.launchpad_creation_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.owner.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            platform.launchpad_creation_fee,
        )?;
    }

    let id = ctx.accounts.platform.launchpad_count;
    let now = Clock::get()?.unix_timestamp;

    let lp = &mut ctx.accounts.launchpad;
    lp.id = id;
    lp.owner = ctx.accounts.owner.key();
    lp.fee_recipient = params.fee_recipient;
    lp.name = params.name;
    lp.uri = params.uri;
    lp.trade_fee_bps = params.trade_fee_bps;
    lp.creator_fee_share_bps = params.creator_fee_share_bps;
    lp.token_launch_fee = params.token_launch_fee;
    lp.curve = params.curve;
    lp.token_count = 0;
    lp.paused = false;
    lp.created_at = now;
    lp.bump = ctx.bumps.launchpad;

    let platform = &mut ctx.accounts.platform;
    platform.launchpad_count = platform
        .launchpad_count
        .checked_add(1)
        .ok_or(SolceptionError::MathOverflow)?;

    emit!(LaunchpadCreated {
        launchpad: lp.key(),
        id,
        owner: lp.owner,
        name: lp.name.clone(),
        trade_fee_bps: lp.trade_fee_bps,
        timestamp: now,
    });
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateLaunchpad<'info> {
    pub owner: Signer<'info>,

    #[account(seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Box<Account<'info, Platform>>,

    #[account(
        mut,
        seeds = [LAUNCHPAD_SEED, &launchpad.id.to_le_bytes()],
        bump = launchpad.bump,
        has_one = owner @ SolceptionError::Unauthorized
    )]
    pub launchpad: Box<Account<'info, Launchpad>>,
}

pub fn update_launchpad(ctx: Context<UpdateLaunchpad>, params: UpdateLaunchpadParams) -> Result<()> {
    let lp = &mut ctx.accounts.launchpad;
    if let Some(v) = params.new_owner {
        lp.owner = v;
    }
    if let Some(v) = params.fee_recipient {
        lp.fee_recipient = v;
    }
    if let Some(v) = params.uri {
        require!(v.len() <= MAX_URI_LEN, SolceptionError::StringTooLong);
        lp.uri = v;
    }
    if let Some(v) = params.trade_fee_bps {
        lp.trade_fee_bps = v;
    }
    if let Some(v) = params.creator_fee_share_bps {
        lp.creator_fee_share_bps = v;
    }
    if let Some(v) = params.token_launch_fee {
        lp.token_launch_fee = v;
    }
    if let Some(v) = params.curve {
        validate_curve(&v)?;
        lp.curve = v;
    }
    if let Some(v) = params.paused {
        lp.paused = v;
    }
    validate_fees(&ctx.accounts.platform, lp.trade_fee_bps, lp.creator_fee_share_bps)?;

    emit!(LaunchpadUpdated {
        launchpad: lp.key(),
        owner: lp.owner,
    });
    Ok(())
}
