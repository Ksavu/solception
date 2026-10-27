use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::mpl_token_metadata::types::DataV2;
use anchor_spl::metadata::{create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata};
use anchor_spl::token::{self, spl_token::instruction::AuthorityType, Mint, MintTo, SetAuthority, Token, TokenAccount};

use crate::errors::SolceptionError;
use crate::events::TokenLaunched;
use crate::math::bps_of;
use crate::state::*;

pub const MAX_TOKEN_NAME_LEN: usize = 32;
pub const MAX_TOKEN_SYMBOL_LEN: usize = 10;

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LaunchTokenParams {
    pub name: String,
    pub symbol: String,
    /// Metaplex JSON (image, description, socials).
    pub uri: String,
}

#[derive(Accounts)]
pub struct LaunchToken<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(seeds = [PLATFORM_SEED], bump = platform.bump)]
    pub platform: Box<Account<'info, Platform>>,

    #[account(
        mut,
        seeds = [LAUNCHPAD_SEED, &launchpad.id.to_le_bytes()],
        bump = launchpad.bump
    )]
    pub launchpad: Box<Account<'info, Launchpad>>,

    /// Fresh keypair from the client (lets you grind vanity "...pad" addresses).
    #[account(
        init,
        payer = creator,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = bonding_curve,
        mint::freeze_authority = bonding_curve
    )]
    pub mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = creator,
        space = 8 + BondingCurve::INIT_SPACE,
        seeds = [CURVE_SEED, mint.key().as_ref()],
        bump
    )]
    pub bonding_curve: Box<Account<'info, BondingCurve>>,

    #[account(
        init,
        payer = creator,
        associated_token::mint = mint,
        associated_token::authority = bonding_curve
    )]
    pub curve_vault: Box<Account<'info, TokenAccount>>,

    /// CHECK: created and validated by the Metaplex program via CPI.
    #[account(
        mut,
        seeds = [b"metadata", token_metadata_program.key().as_ref(), mint.key().as_ref()],
        bump,
        seeds::program = token_metadata_program.key()
    )]
    pub metadata: UncheckedAccount<'info>,

    pub token_metadata_program: Program<'info, Metadata>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn launch_token(ctx: Context<LaunchToken>, params: LaunchTokenParams) -> Result<()> {
    let platform = &ctx.accounts.platform;
    let launchpad = &ctx.accounts.launchpad;
    require!(!platform.paused, SolceptionError::PlatformPaused);
    require!(!launchpad.paused, SolceptionError::LaunchpadPaused);
    require!(!params.name.trim().is_empty(), SolceptionError::EmptyName);
    require!(
        params.name.len() <= MAX_TOKEN_NAME_LEN
            && params.symbol.len() <= MAX_TOKEN_SYMBOL_LEN
            && params.uri.len() <= MAX_URI_LEN,
        SolceptionError::StringTooLong
    );

    let cfg = launchpad.curve;
    let total_supply = cfg
        .curve_token_supply
        .checked_add(cfg.lp_token_reserve)
        .ok_or(SolceptionError::MathOverflow)?;

    // Launch fee: lands in the curve and is accrued, then claimed per bucket.
    let launch_fee = launchpad.token_launch_fee;
    let platform_cut = bps_of(launch_fee, platform.platform_fee_share_bps)
        .ok_or(SolceptionError::MathOverflow)?;
    let launchpad_cut = launch_fee - platform_cut;
    if launch_fee > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.creator.to_account_info(),
                    to: ctx.accounts.bonding_curve.to_account_info(),
                },
            ),
            launch_fee,
        )?;
    }

    let mint_key = ctx.accounts.mint.key();
    let curve_bump = ctx.bumps.bonding_curve;
    let signer_seeds: &[&[&[u8]]] = &[&[CURVE_SEED, mint_key.as_ref(), &[curve_bump]]];

    // 1. Mint the full fixed supply into the curve vault.
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.curve_vault.to_account_info(),
                authority: ctx.accounts.bonding_curve.to_account_info(),
            },
            signer_seeds,
        ),
        total_supply,
    )?;

    // 2. Metaplex metadata, immutable.
    create_metadata_accounts_v3(
        CpiContext::new_with_signer(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.bonding_curve.to_account_info(),
                payer: ctx.accounts.creator.to_account_info(),
                update_authority: ctx.accounts.bonding_curve.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
            signer_seeds,
        ),
        DataV2 {
            name: params.name.clone(),
            symbol: params.symbol.clone(),
            uri: params.uri.clone(),
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        },
        false, // is_mutable
        true,  // update_authority_is_signer
        None,
    )?;

    // 3. Renounce mint + freeze authority: supply is fixed, nobody can freeze holders.
    for authority_type in [AuthorityType::MintTokens, AuthorityType::FreezeAccount] {
        token::set_authority(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                SetAuthority {
                    current_authority: ctx.accounts.bonding_curve.to_account_info(),
                    account_or_mint: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            authority_type,
            None,
        )?;
    }

    let now = Clock::get()?.unix_timestamp;
    let launchpad_key = ctx.accounts.launchpad.key();

    let curve = &mut ctx.accounts.bonding_curve;
    curve.launchpad = launchpad_key;
    curve.mint = mint_key;
    curve.creator = ctx.accounts.creator.key();
    curve.virtual_sol_reserves = cfg.initial_virtual_sol;
    curve.virtual_token_reserves = cfg.initial_virtual_tokens;
    curve.real_sol_reserves = 0;
    curve.real_token_reserves = cfg.curve_token_supply;
    curve.lp_token_reserve = cfg.lp_token_reserve;
    curve.token_total_supply = total_supply;
    curve.platform_fees_accrued = platform_cut;
    curve.launchpad_fees_accrued = launchpad_cut;
    curve.creator_fees_accrued = 0;
    curve.complete = false;
    curve.migrated = false;
    curve.created_at = now;
    curve.bump = curve_bump;

    let lp = &mut ctx.accounts.launchpad;
    lp.token_count = lp.token_count.checked_add(1).ok_or(SolceptionError::MathOverflow)?;

    emit!(TokenLaunched {
        launchpad: launchpad_key,
        mint: mint_key,
        bonding_curve: ctx.accounts.bonding_curve.key(),
        creator: ctx.accounts.creator.key(),
        name: params.name,
        symbol: params.symbol,
        uri: params.uri,
        virtual_sol_reserves: cfg.initial_virtual_sol,
        virtual_token_reserves: cfg.initial_virtual_tokens,
        total_supply,
        timestamp: now,
    });
    Ok(())
}
