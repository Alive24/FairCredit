use anchor_lang::prelude::*;

/// Educational provider state
#[account]
#[derive(InitSpace)]
pub struct Provider {
    /// Provider wallet address
    pub wallet: Pubkey,
    /// Organization name
    #[max_len(50)]
    pub name: String,
    /// Organization description
    #[max_len(200)]
    pub description: String,
    /// Website URL
    #[max_len(100)]
    pub website: String,
    /// Contact email
    #[max_len(50)]
    pub email: String,
    /// Provider type (University, College, Institution, etc.)
    #[max_len(30)]
    pub provider_type: String,
    /// Registration timestamp
    pub registered_at: i64,
}

impl Provider {
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "provider";
    
    /// Check if provider can issue credentials
    /// In decentralized system, all providers can issue credentials
    pub fn can_issue_credentials(&self) -> bool {
        true
    }
}


