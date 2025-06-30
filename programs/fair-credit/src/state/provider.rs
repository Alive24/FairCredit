use anchor_lang::prelude::*;
use crate::types::{ProviderStatus, TrustLevel};

/// Educational provider data structure
/// Stores verified educational institution information including reputation and statistics
#[account]
pub struct EducationalProvider {
    /// Provider wallet address (serves as unique identifier)
    pub wallet: Pubkey,
    /// Institution name
    pub name: String,
    /// Institution description
    pub description: String,
    /// Verification status
    pub verification_status: ProviderStatus,
    /// Total number of credentials issued
    pub credentials_issued: u64,
    /// Reputation score (0-100)
    pub reputation_score: u64,
    /// Registration timestamp
    pub registered_at: i64,
}

impl EducationalProvider {
    /// Calculate space required for educational provider account
    pub const SPACE: usize = std::mem::size_of::<EducationalProvider>() + 256; // Extra space for strings
    
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "provider";
    
    /// Space calculation function for Anchor compatibility
    pub fn space() -> usize {
        Self::SPACE
    }
    
    /// Update verification status
    pub fn update_verification_status(&mut self, new_status: ProviderStatus) {
        self.verification_status = new_status;
    }
    
    /// Increment credentials issued count
    pub fn increment_credentials_issued(&mut self) {
        self.credentials_issued += 1;
    }
    
    /// Update reputation score
    pub fn update_reputation_score(&mut self, new_score: u64) {
        // Ensure score is within valid range
        self.reputation_score = new_score.min(100);
    }
    
    /// Check if provider can issue credentials
    pub fn can_issue_credentials(&self) -> bool {
        self.verification_status == ProviderStatus::Verified
    }
    
    /// Calculate trust level based on statistics
    pub fn trust_level(&self) -> TrustLevel {
        match (self.credentials_issued, self.reputation_score) {
            (issued, score) if issued >= 100 && score >= 90 => TrustLevel::Excellent,
            (issued, score) if issued >= 50 && score >= 80 => TrustLevel::High,
            (issued, score) if issued >= 10 && score >= 70 => TrustLevel::Good,
            (issued, score) if issued >= 1 && score >= 60 => TrustLevel::Fair,
            _ => TrustLevel::New,
        }
    }
}

 