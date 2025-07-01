use anchor_lang::prelude::*;

/// Educational provider state
#[account]
pub struct Provider {
    /// Provider wallet address
    pub wallet: Pubkey,
    /// Organization name
    pub name: String,
    /// Organization description
    pub description: String,
    /// Website URL
    pub website: String,
    /// Contact email
    pub email: String,
    /// Provider type (University, College, Institution, etc.)
    pub provider_type: String,
    /// Registration timestamp
    pub registered_at: i64,
}

impl Provider {
    /// Calculate space required for provider account (adjusted for realistic string lengths)
    pub const SPACE: usize = 8 + // discriminator
        32 + // wallet
        4 + 50 + // name (max 50 chars)
        4 + 200 + // description (max 200 chars)
        4 + 100 + // website (max 100 chars)
        4 + 50 + // email (max 50 chars)
        4 + 30 + // provider_type (max 30 chars)
        8; // registered_at
    
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "provider";
    
    /// Check if provider can issue credentials
    /// In decentralized system, all providers can issue credentials
    pub fn can_issue_credentials(&self) -> bool {
        true
    }
    
    /// Space calculation function for Anchor compatibility
    pub fn space() -> usize {
        Self::SPACE
    }
}


