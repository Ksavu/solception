use anchor_lang::prelude::*;

use crate::errors::SolceptionError;
use crate::events::FeesClaimed;
use crate::state::*;

/// Permissionless: anyone (a crank, the owner, a bot) can sweep a bucket,
/// but funds only ever go to the recipient stored on-chain for that bucket.
#[derive(Accounts)]
pub struct ClaimFees<'info> {
    #[account(seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Box<Account<'info, Platform>>,

    #[account(
        seeds = [LAUNCHPAD_SEED, &launchpad.id.to_le_bytes()],
        bump = launchpad.bump
    )]
    pub launchpad: Box<Account<'info, Launchpad>>,

    #[account(
        mut,
        seeds = [CURVE_SEED, bonding_curve.mint.as_ref()],
        bump = bonding_curve.bump,
        has_one = launchpad
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,

    /// CHECK: verified against the bucket's stored recipient in the handler.
    #[account(mut)]
    pub recipient: UncheckedAccount<'info>,
}

pub fn claim_fees(ctx: Context<ClaimFees>, bucket: FeeBucket) -> Result<()> {
    let expected = match bucket {
        FeeBucket::Platform => ctx.accounts.platform.treasury,
        FeeBucket::Launchpad => ctx.accounts.launchpad.fee_recipient,
        FeeBucket::Creator => ctx.accounts.bonding_curve.creator,
    };
    require_keys_eq!(ctx.accounts.recipient.key(), expected, SolceptionError::WrongFeeRecipient);

    let amount = {
        let c = &mut ctx.accounts.bonding_curve;
        let slot = match bucket {
            FeeBucket::Platform => &mut c.platform_fees_accrued,
            FeeBucket::Launchpad => &mut c.launchpad_fees_accrued,
            FeeBucket::Creator => &mut c.creator_fees_accrued,
        };
        let amount = *slot;
        *slot = 0;
        amount
    };
    require!(amount > 0, SolceptionError::NothingToClaim);

    ctx.accounts.bonding_curve.sub_lamports(amount)?;
    ctx.accounts.recipient.add_lamports(amount)?;

    emit!(FeesClaimed {
        mint: ctx.accounts.bonding_curve.mint,
        bucket,
        recipient: expected,
        amount,
    });
    Ok(())
}
