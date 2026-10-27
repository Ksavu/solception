//! Pure bonding-curve and fee math. No Anchor types, so it is unit-testable.
//!
//! Constant product on *virtual* reserves: vs * vt = k.
//! All rounding favours the curve (the user never gets more than k allows).

pub const BPS_DENOMINATOR: u64 = 10_000;

/// amount * bps / 10_000, rounded down.
pub fn bps_of(amount: u64, bps: u16) -> Option<u64> {
    let v = (amount as u128)
        .checked_mul(bps as u128)?
        .checked_div(BPS_DENOMINATOR as u128)?;
    u64::try_from(v).ok()
}

/// Tokens received for `sol_in` (net of fees).
pub fn tokens_out_for_sol(vs: u64, vt: u64, sol_in: u64) -> Option<u64> {
    if sol_in == 0 {
        return Some(0);
    }
    let (vs, vt) = (vs as u128, vt as u128);
    let k = vs.checked_mul(vt)?;
    let new_vs = vs.checked_add(sol_in as u128)?;
    let new_vt = k.div_ceil(new_vs);
    u64::try_from(vt.checked_sub(new_vt)?).ok()
}

/// SOL (net of fees) required to buy exactly `tokens` out of the curve.
pub fn sol_in_for_tokens(vs: u64, vt: u64, tokens: u64) -> Option<u64> {
    if tokens == 0 {
        return Some(0);
    }
    let (vs, vt) = (vs as u128, vt as u128);
    let k = vs.checked_mul(vt)?;
    let new_vt = vt.checked_sub(tokens as u128)?;
    if new_vt == 0 {
        return None;
    }
    let new_vs = k.div_ceil(new_vt);
    u64::try_from(new_vs.checked_sub(vs)?).ok()
}

/// SOL (before fees) received for selling `tokens_in` into the curve.
pub fn sol_out_for_tokens(vs: u64, vt: u64, tokens_in: u64) -> Option<u64> {
    if tokens_in == 0 {
        return Some(0);
    }
    let (vs, vt) = (vs as u128, vt as u128);
    let k = vs.checked_mul(vt)?;
    let new_vt = vt.checked_add(tokens_in as u128)?;
    let new_vs = k.div_ceil(new_vt);
    u64::try_from(vs.checked_sub(new_vs)?).ok()
}

/// How a fee is split up the "ception" tree.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct FeeSplit {
    pub platform: u64,
    pub launchpad: u64,
    pub creator: u64,
}

impl FeeSplit {
    pub fn total(&self) -> u64 {
        self.platform + self.launchpad + self.creator
    }
}

/// Platform takes `platform_share_bps` of the fee first.
/// Of what is left, the token creator gets `creator_share_bps`.
/// The launchpad owner keeps the remainder (including all rounding dust).
pub fn split_fee(fee: u64, platform_share_bps: u16, creator_share_bps: u16) -> Option<FeeSplit> {
    let platform = bps_of(fee, platform_share_bps)?;
    let after_platform = fee.checked_sub(platform)?;
    let creator = bps_of(after_platform, creator_share_bps)?;
    let launchpad = after_platform.checked_sub(creator)?;
    Some(FeeSplit { platform, launchpad, creator })
}

#[cfg(test)]
mod tests {
    use super::*;

    // pump.fun-style defaults: 30 SOL virtual, 1.073B virtual tokens, 6 decimals
    const VS: u64 = 30_000_000_000;
    const VT: u64 = 1_073_000_000_000_000;
    const CURVE_SUPPLY: u64 = 793_100_000_000_000;

    #[test]
    fn buy_then_sell_never_profits() {
        let sol = 1_000_000_000; // 1 SOL
        let tokens = tokens_out_for_sol(VS, VT, sol).unwrap();
        assert!(tokens > 0);
        let sol_back = sol_out_for_tokens(VS + sol, VT - tokens, tokens).unwrap();
        assert!(sol_back <= sol, "round trip must not create SOL");
    }

    #[test]
    fn exact_out_covers_quote() {
        for sol in [1u64, 1_000, 10_000_000, 1_000_000_000, 50_000_000_000] {
            let tokens = tokens_out_for_sol(VS, VT, sol).unwrap();
            if tokens == 0 {
                continue;
            }
            let needed = sol_in_for_tokens(VS, VT, tokens).unwrap();
            assert!(needed <= sol, "needed {needed} > paid {sol}");
        }
    }

    #[test]
    fn k_never_decreases() {
        let k0 = VS as u128 * VT as u128;
        let sol = 3_333_333_333;
        let t = tokens_out_for_sol(VS, VT, sol).unwrap();
        let (vs1, vt1) = (VS + sol, VT - t);
        assert!(vs1 as u128 * vt1 as u128 >= k0);
        let s = sol_out_for_tokens(vs1, vt1, t / 2).unwrap();
        let (vs2, vt2) = (vs1 - s, vt1 + t / 2);
        assert!(vs2 as u128 * vt2 as u128 >= k0);
    }

    #[test]
    fn full_curve_cost_is_about_85_sol() {
        let sol = sol_in_for_tokens(VS, VT, CURVE_SUPPLY).unwrap();
        // 30 * 1073 / (1073 - 793.1) - 30 ≈ 85.0 SOL
        assert!((84_000_000_000..86_000_000_000).contains(&sol), "{sol}");
    }

    #[test]
    fn cannot_drain_virtual_reserve() {
        assert!(sol_in_for_tokens(VS, VT, VT).is_none());
        assert!(sol_in_for_tokens(VS, VT, VT + 1).is_none());
    }

    #[test]
    fn fee_split_adds_up() {
        for fee in [0u64, 1, 7, 999, 10_000_000, u32::MAX as u64] {
            let s = split_fee(fee, 2_500, 3_000).unwrap();
            assert_eq!(s.total(), fee);
        }
        let s = split_fee(10_000, 2_500, 4_000).unwrap();
        assert_eq!(s, FeeSplit { platform: 2_500, creator: 3_000, launchpad: 4_500 });
    }

    #[test]
    fn bps_rounds_down() {
        assert_eq!(bps_of(999, 100), Some(9));
        assert_eq!(bps_of(u64::MAX, 10_000), Some(u64::MAX));
    }
}
