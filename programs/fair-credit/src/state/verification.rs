use anchor_lang::prelude::*;
use crate::types::{VerificationFrequency, VerificationStats};

/// Verification record data structure
/// Tracks verification history and statistics for credentials
#[account]
pub struct VerificationRecord {
    /// Associated credential ID
    pub credential_id: u64,
    /// Verifier's wallet address (optional, some verifications may be anonymous)
    pub verifier_wallet: Option<Pubkey>,
    /// Verification timestamp
    pub verified_at: i64,
    /// Total verification count for this credential
    pub verification_count: u64,
}

impl VerificationRecord {
    /// Calculate space required for verification record account
    pub const SPACE: usize = std::mem::size_of::<VerificationRecord>() + 64; // Extra space
    
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "verification";
    
    /// Space calculation function for Anchor compatibility
    pub fn space() -> usize {
        Self::SPACE
    }
    
    /// Create new verification record
    pub fn new(credential_id: u64, verifier_wallet: Option<Pubkey>) -> Self {
        Self {
            credential_id,
            verifier_wallet,
            verified_at: Clock::get().unwrap().unix_timestamp,
            verification_count: 1,
        }
    }
    
    /// Update verification record (for multiple verifications of the same credential)
    pub fn update_verification(&mut self, verifier_wallet: Option<Pubkey>) {
        self.verifier_wallet = verifier_wallet;
        self.verified_at = Clock::get().unwrap().unix_timestamp;
        self.verification_count += 1;
    }
    
    /// Check if this is an anonymous verification
    pub fn is_anonymous_verification(&self) -> bool {
        self.verifier_wallet.is_none()
    }
    
    /// Get verification frequency level
    pub fn verification_frequency(&self) -> VerificationFrequency {
        match self.verification_count {
            1 => VerificationFrequency::First,
            2..=5 => VerificationFrequency::Low,
            6..=20 => VerificationFrequency::Medium,
            21..=100 => VerificationFrequency::High,
            _ => VerificationFrequency::VeryHigh,
        }
    }
}

 