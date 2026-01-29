use anchor_lang::prelude::*;
use crate::types::{CredentialMetadata, CredentialStatus};

/// Main credential data structure
/// Stores core information of academic credentials including participants, metadata and status
#[account]
#[derive(InitSpace)]
pub struct Credential {
    /// Unique credential identifier
    pub id: u64,
    /// Creation timestamp
    pub created: i64,
    /// Last update timestamp
    pub updated: i64,
    /// Student wallet address
    pub student_wallet: Pubkey,
    /// Mentor wallet address
    pub mentor_wallet: Pubkey,
    /// Educational provider wallet address
    pub provider_wallet: Pubkey,
    /// Associated NFT mint address
    pub nft_mint: Pubkey,
    /// Detailed credential metadata
    pub metadata: CredentialMetadata,
    /// Verification count statistics
    pub verification_count: u64,
    /// Current status
    pub status: CredentialStatus,
}

impl Credential {
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "credential";
    
    /// Update credential status
    pub fn update_status(&mut self, new_status: CredentialStatus) {
        self.status = new_status;
        self.updated = Clock::get().unwrap().unix_timestamp;
    }
    
    /// Increment verification count
    pub fn increment_verification_count(&mut self) {
        self.verification_count += 1;
        self.updated = Clock::get().unwrap().unix_timestamp;
    }
} 