use anchor_lang::prelude::*;

/// Verifier action types for tracking operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VerifierAction {
    /// Provider was suspended
    Suspend,
    /// Provider was unsuspended
    Unsuspend,
    /// Reputation score was updated
    UpdateReputation,
    /// Assessment was created
    CreateAssessment,
}

/// Reputation score range validation
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ReputationRange {
    /// 0-20: Poor reputation
    Poor,
    /// 21-40: Below average
    BelowAverage,
    /// 41-60: Average
    Average,
    /// 61-80: Good
    Good,
    /// 81-100: Excellent
    Excellent,
}

impl ReputationRange {
    /// Convert reputation score to range
    pub fn from_score(score: u64) -> Self {
        match score {
            0..=20 => ReputationRange::Poor,
            21..=40 => ReputationRange::BelowAverage,
            41..=60 => ReputationRange::Average,
            61..=80 => ReputationRange::Good,
            81..=100 => ReputationRange::Excellent,
            _ => ReputationRange::Average, // Default for out-of-range values
        }
    }
}

/// Verifier-specific errors
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VerifierError {
    /// Provider not found in assessments
    ProviderNotFound,
    /// Invalid reputation score (must be 0-100)
    InvalidReputationScore,
    /// Assessment already exists
    AssessmentAlreadyExists,
    /// Unauthorized verifier action
    UnauthorizedAction,
} 