use anchor_lang::prelude::*;

#[error_code]
pub enum SolceptionError {
    #[msg("Signer is not authorized for this action")]
    Unauthorized,
    #[msg("Platform is paused")]
    PlatformPaused,
    #[msg("Launchpad is paused")]
    LaunchpadPaused,
    #[msg("Basis points value out of range")]
    InvalidBps,
    #[msg("Trade fee exceeds the platform maximum")]
    TradeFeeTooHigh,
    #[msg("Invalid curve configuration")]
    InvalidCurveConfig,
    #[msg("Name or URI too long")]
    StringTooLong,
    #[msg("Name must not be empty")]
    EmptyName,
    #[msg("Amount must be greater than zero")]
    ZeroAmount,
    #[msg("Slippage limit exceeded")]
    SlippageExceeded,
    #[msg("Bonding curve has completed; trade on the DEX")]
    CurveComplete,
    #[msg("Bonding curve has not completed yet")]
    CurveNotComplete,
    #[msg("Liquidity already migrated")]
    AlreadyMigrated,
    #[msg("Not enough SOL in the curve")]
    InsufficientSolReserves,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Recipient does not match the fee bucket")]
    WrongFeeRecipient,
    #[msg("Math overflow")]
    MathOverflow,
}
