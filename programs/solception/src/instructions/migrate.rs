use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::SolceptionError;
use crate::events::LiquidityWithdrawnForMigration;
use crate::state::*;

/// v1 graduation: the platform's migration authority pulls the raised SOL and
/// the LP token reserve, then seeds a Raydium CPMM / Meteora pool and burns the LP.
/// Accrued fees stay in the curve and remain claimable.
#[derive(Accounts)]
pub struct WithdrawForMigration<'info> {
    #[account(mut)]
    pub migration_authority: Signer<'info>,

    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform.bump,
        has_one = migration_authority @ SolceptionError::Unauthorized
    )]
    pub platform: Box<Account<'info, Platform>>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [CURVE_SEED, mint.key().as_ref()],
        bump = bonding_curve.bump,
        has_one = mint
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = migration_authority,
        associated_token::mint = mint,
        associated_token::authority = migration_authority
    )]
    pub migration_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn withdraw_for_migration(ctx: Context<WithdrawForMigration>) -> Result<()> {
    let c = &ctx.accounts.bonding_curve;
    require!(c.complete, SolceptionError::CurveNotComplete);
    require!(!c.migrated, SolceptionError::AlreadyMigrated);

    let sol_amount = c.real_sol_reserves;
    let token_amount = ctx.accounts.curve_vault.amount;

    let mint_key = ctx.accounts.mint.key();
    let bump = c.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[CURVE_SEED, mint_key.as_ref(), &[bump]]];

    if token_amount > 0 {
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.curve_vault.to_account_info(),
                    to: ctx.accounts.migration_token_account.to_account_info(),
                    authority: ctx.accounts.bonding_curve.to_account_info(),
                },
                signer_seeds,
            ),
            token_amount,
        )?;
    }

    ctx.accounts.bonding_curve.sub_lamports(sol_amount)?;
    ctx.accounts.migration_authority.add_lamports(sol_amount)?;

    let c = &mut ctx.accounts.bonding_curve;
    c.real_sol_reserves = 0;
    c.real_token_reserves = 0;
    c.lp_token_reserve = 0;
    c.migrated = true;

    emit!(LiquidityWithdrawnForMigration {
        launchpad: c.launchpad,
        mint: mint_key,
        sol_amount,
        token_amount,
        migration_authority: ctx.accounts.migration_authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    Ok(())
}
