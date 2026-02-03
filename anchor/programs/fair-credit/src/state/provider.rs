use anchor_lang::prelude::*;

/// Educational provider state.
/// Provider creates Courses (Hub must accept them to be usable) and manages its own Endorsers (no Hub acceptance).
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
    /// Endorser wallets set by this provider (no Hub acceptance required)
    #[max_len(100)]
    pub endorsers: Vec<Pubkey>,
}

impl Provider {
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "provider";

    /// Add an endorser wallet
    pub fn add_endorser(&mut self, endorser: Pubkey) -> Result<()> {
        if !self.endorsers.contains(&endorser) {
            self.endorsers.push(endorser);
        }
        Ok(())
    }

    /// Remove an endorser wallet
    pub fn remove_endorser(&mut self, endorser: &Pubkey) -> Result<()> {
        self.endorsers.retain(|e| e != endorser);
        Ok(())
    }
}
