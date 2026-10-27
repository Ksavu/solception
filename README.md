# Solception

A launchpad that launches launchpads, on Solana (Anchor 0.32).

```
Layer 0  Platform       Solception. Earns launchpad creation fees + a cut of every fee.
Layer 1  Launchpad      Anyone deploys one: own name, branding, fees, curve settings.
Layer 2  Bonding curve  One per token. Fixed supply, graduates to a DEX when sold out.
```

## Instructions

| Instruction | Who | What |
|---|---|---|
| `initialize_platform` | program upgrade authority | One-time setup (front-run safe) |
| `update_platform` | platform authority | Fees, treasury, migration wallet, pause |
| `create_launchpad` | anyone | Pays `launchpad_creation_fee` to treasury |
| `update_launchpad` | launchpad owner | Fees, branding URI, curve (future tokens), pause, transfer |
| `launch_token` | anyone | Mints fixed supply to curve, Metaplex metadata (immutable), revokes mint + freeze |
| `buy` / `sell` | anyone | Constant-product on virtual reserves, slippage-protected |
| `claim_fees` | anyone (crank) | Sweeps a fee bucket to its stored recipient |
| `withdraw_for_migration` | migration authority | Pulls SOL + LP reserve after the curve completes |

## Fee cascade

Every trade fee (and token launch fee) is split:

1. **Platform** takes `platform_fee_share_bps` first.
2. **Token creator** gets `creator_fee_share_bps` of the rest (trades only).
3. **Launchpad owner** keeps the remainder.

Fees accrue inside each token's curve account, so trades never write-lock a global
account (no contention between hot tokens). `claim_fees` is permissionless; funds
can only go to the recipient stored on-chain.

Recipients must already hold rent-exempt SOL (~0.001 SOL), or small claims fail.

## Safety properties

- Fixed supply: mint and freeze authority revoked at launch. Metadata immutable.
- Sells stay open when the platform or a launchpad is paused.
- Platform caps trade fees (`max_trade_fee_bps`, hard ceiling 10%). Lowering the cap applies to existing pads immediately.
- Rounding always favours the curve; checked math everywhere; `overflow-checks = true`.
- The buy that completes the curve is only charged for the tokens actually left.

## Default curve (pump.fun-style)

```
initial_virtual_sol    = 30 SOL
initial_virtual_tokens = 1,073,000,000 (6 decimals)
curve_token_supply     = 793,100,000   -> ~85 SOL raised to complete
lp_token_reserve       = 206,900,000   -> paired with raised SOL on the DEX
```

## Build & test

Requires Solana CLI 2.3.x and Anchor CLI 0.32.1.

```bash
anchor keys sync          # writes YOUR program keypair's ID into the code
anchor build

# Local tests need the Metaplex program as a fixture:
mkdir -p tests/fixtures
solana program dump -u m metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s tests/fixtures/mpl_token_metadata.so
npm install
anchor test

cargo test                # bonding-curve and fee math unit tests
```

`Cargo.lock` pins a few crates (blake3, proc-macro-crate, indexmap, zeroize,
unicode-segmentation) to versions that build with the Solana 2.3 SBF toolchain.
Don't `cargo update` blindly.

## Deploy (devnet)

```bash
solana config set -u devnet
anchor deploy --provider.cluster devnet
# then call initialize_platform from the upgrade-authority wallet
```

Use a multisig (Squads) for the upgrade authority, platform authority and migration authority on mainnet.

## Not done yet (v1 → v2)

- **Graduation is semi-custodial**: `withdraw_for_migration` sends liquidity to the
  migration wallet, which creates the Raydium CPMM / Meteora pool and burns the LP
  off-chain (the original pump.fun model). v2: on-chain CPI into Raydium CPMM or Meteora DAMM v2.
- No audit yet. Get one before mainnet.
- Frontend, indexer (Trade events → candles), and a fee-claim crank.
