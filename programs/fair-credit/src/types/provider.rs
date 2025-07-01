use anchor_lang::prelude::*;



/// Trust level enumeration
/// Based on provider's historical performance and reputation score
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum TrustLevel {
    /// New institution - Recently registered or few credentials issued
    New,
    /// Fair - Basic trust level
    Fair,
    /// Good - Decent historical record
    Good,
    /// High - Excellent historical record and reputation
    High,
    /// Excellent - Highest level of trust
    Excellent,
} 