use anchor_lang::prelude::*;

/// Educational provider status enumeration
/// Tracks provider's verification and operational status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProviderStatus {
    /// Pending review - Provider has applied but not yet verified
    Pending,
    /// Verified - Provider is verified and can issue credentials
    Verified,
    /// Suspended - Provider has been suspended for some reason
    Suspended,
}

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