use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::errors::SolceptionError;
use crate::events::{CurveCompleted, Trade};
use crate::math::*;
use crate::state::*;

/// Trades only write-lock the token's own curve + vault + user accounts,
/// so busy tokens never contend on a global platform/launchpad account.
#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Box<Account<'info, Platform>>,

    #[account(
        seeds = [LAUNCHPAD_SEED, &launchpad.id.to_le_bytes()],
        bump = launchpad.bump
    )]
    pub launchpad: Box<Account<'info, Launchpad>>,

    pub mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        seeds = [CURVE_SEED, mint.key().as_ref()],
        bump = bonding_curve.bump,
        has_one = mint,
        has_one = launchpad
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
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Swap<'info> {
    /// Platform can lower the max fee later; it applies to existing pads immediately.
    fn effective_fee_bps(&self) -> u16 {
        self.launchpad.trade_fee_bps.min(self.platform.max_trade_fee_bps)
    }

    fn accrue_fee(&mut self, fee: u64) -> Result<()> {
        let split = split_fee(
            fee,
            self.platform.platform_fee_share_bps,
            self.launchpad.creator_fee_share_bps,
        )
        .ok_or(SolceptionError::MathOverflow)?;
        let c = &mut self.bonding_curve;
        c.platform_fees_accrued = c.platform_fees_accrued.checked_add(split.platform).ok_or(SolceptionError::MathOverflow)?;
        c.launchpad_fees_accrued = c.launchpad_fees_accrued.checked_add(split.launchpad).ok_or(SolceptionError::MathOverflow)?;
        c.creator_fees_accrued = c.creator_fees_accrued.checked_add(split.creator).ok_or(SolceptionError::MathOverflow)?;
        Ok(())
    }

    fn emit_trade(&self, is_buy: bool, sol_amount: u64, token_amount: u64, fee: u64, now: i64) {
        let c = &self.bonding_curve;
        emit!(Trade {
            launchpad: c.launchpad,
            mint: c.mint,
            user: self.user.key(),
            is_buy,
            sol_amount,
            token_amount,
            fee,
            virtual_sol_reserves: c.virtual_sol_reserves,
            virtual_token_reserves: c.virtual_token_reserves,
            real_sol_reserves: c.real_sol_reserves,
            real_token_reserves: c.real_token_reserves,
            timestamp: now,
        });
    }
}

/// `max_sol_cost` is the most SOL (fee included) the user will spend.
/// The final buy that completes the curve is charged only for what it gets.
pub fn buy(ctx: Context<Swap>, max_sol_cost: u64, min_tokens_out: u64) -> Result<()> {
    require!(max_sol_cost > 0, SolceptionError::ZeroAmount);
    require!(!ctx.accounts.platform.paused, SolceptionError::PlatformPaused);
    require!(!ctx.accounts.launchpad.paused, SolceptionError::LaunchpadPaused);
    require!(!ctx.accounts.bonding_curve.complete, SolceptionError::CurveComplete);

    let fee_bps = ctx.accounts.effective_fee_bps();
    let (vs, vt, real_tokens) = {
        let c = &ctx.accounts.bonding_curve;
        (c.virtual_sol_reserves, c.virtual_token_reserves, c.real_token_reserves)
    };

    let mut fee = bps_of(max_sol_cost, fee_bps).ok_or(SolceptionError::MathOverflow)?;
    let mut net_sol = max_sol_cost - fee;
    let mut tokens_out = tokens_out_for_sol(vs, vt, net_sol).ok_or(SolceptionError::MathOverflow)?;

    let completes = tokens_out >= real_tokens;
    if completes {
        tokens_out = real_tokens;
        net_sol = sol_in_for_tokens(vs, vt, tokens_out).ok_or(SolceptionError::MathOverflow)?;
        fee = bps_of(net_sol, fee_bps).ok_or(SolceptionError::MathOverflow)?;
    }

    require!(tokens_out > 0, SolceptionError::ZeroAmount);
    require!(tokens_out >= min_tokens_out, SolceptionError::SlippageExceeded);
    let total_cost = net_sol.checked_add(fee).ok_or(SolceptionError::MathOverflow)?;
    require!(total_cost <= max_sol_cost, SolceptionError::SlippageExceeded);

    // SOL in: reserves + fee both sit in the curve PDA.
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.user.to_account_info(),
                to: ctx.accounts.bonding_curve.to_account_info(),
            },
        ),
        total_cost,
    )?;

    // Tokens out, signed by the curve PDA.
    let mint_key = ctx.accounts.mint.key();
    let bump = ctx.accounts.bonding_curve.bump;
    let signer_seeds: &[&[&[u8]]] = &[&[CURVE_SEED, mint_key.as_ref(), &[bump]]];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.curve_vault.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        tokens_out,
    )?;

    ctx.accounts.accrue_fee(fee)?;
    let now = Clock::get()?.unix_timestamp;
    {
        let c = &mut ctx.accounts.bonding_curve;
        c.virtual_sol_reserves = c.virtual_sol_reserves.checked_add(net_sol).ok_or(SolceptionError::MathOverflow)?;
        c.virtual_token_reserves = c.virtual_token_reserves.checked_sub(tokens_out).ok_or(SolceptionError::MathOverflow)?;
        c.real_sol_reserves = c.real_sol_reserves.checked_add(net_sol).ok_or(SolceptionError::MathOverflow)?;
        c.real_token_reserves = c.real_token_reserves.checked_sub(tokens_out).ok_or(SolceptionError::MathOverflow)?;
        if c.real_token_reserves == 0 {
            c.complete = true;
        }
    }

    ctx.accounts.emit_trade(true, net_sol, tokens_out, fee, now);
    if ctx.accounts.bonding_curve.complete {
        let c = &ctx.accounts.bonding_curve;
        emit!(CurveCompleted {
            launchpad: c.launchpad,
            mint: c.mint,
            real_sol_reserves: c.real_sol_reserves,
            timestamp: now,
        });
    }
    Ok(())
}

/// Sells stay open even when the platform or launchpad is paused,
/// so holders can always exit while the curve is live.
pub fn sell(ctx: Context<Swap>, token_amount: u64, min_sol_out: u64) -> Result<()> {
    require!(token_amount > 0, SolceptionError::ZeroAmount);
    require!(!ctx.accounts.bonding_curve.complete, SolceptionError::CurveComplete);

    let fee_bps = ctx.accounts.effective_fee_bps();
    let (vs, vt, real_sol) = {
        let c = &ctx.accounts.bonding_curve;
        (c.virtual_sol_reserves, c.virtual_token_reserves, c.real_sol_reserves)
    };

    let gross = sol_out_for_tokens(vs, vt, token_amount).ok_or(SolceptionError::MathOverflow)?;
    require!(gross <= real_sol, SolceptionError::InsufficientSolReserves);
    let fee = bps_of(gross, fee_bps).ok_or(SolceptionError::MathOverflow)?;
    let net = gross - fee;
    require!(net > 0, SolceptionError::ZeroAmount);
    require!(net >= min_sol_out, SolceptionError::SlippageExceeded);

    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.curve_vault.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        ),
        token_amount,
    )?;

    // Curve PDA is program-owned, so lamports move directly. Fee stays in the PDA.
    ctx.accounts.bonding_curve.sub_lamports(net)?;
    ctx.accounts.user.add_lamports(net)?;

    ctx.accounts.accrue_fee(fee)?;
    let now = Clock::get()?.unix_timestamp;
    {
        let c = &mut ctx.accounts.bonding_curve;
        c.virtual_sol_reserves = c.virtual_sol_reserves.checked_sub(gross).ok_or(SolceptionError::MathOverflow)?;
        c.virtual_token_reserves = c.virtual_token_reserves.checked_add(token_amount).ok_or(SolceptionError::MathOverflow)?;
        c.real_sol_reserves = c.real_sol_reserves.checked_sub(gross).ok_or(SolceptionError::MathOverflow)?;
        c.real_token_reserves = c.real_token_reserves.checked_add(token_amount).ok_or(SolceptionError::MathOverflow)?;
    }

    ctx.accounts.emit_trade(false, gross, token_amount, fee, now);
    Ok(())
}
