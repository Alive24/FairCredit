use anchor_lang::prelude::*;

/// Verification frequency enumeration
/// Categorizes credential attention level based on verification count
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum VerificationFrequency {
    /// First verification
    First,
    /// Low frequency verification (2-5 times)
    Low,
    /// Medium frequency verification (6-20 times)
    Medium,
    /// High frequency verification (21-100 times)
    High,
    /// Very high frequency verification (100+ times)
    VeryHigh,
}

/// Verification statistics data structure
/// Used for aggregating and analyzing verification data
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VerificationStats {
    /// Total verification count
    pub total_verifications: u64,
    /// Number of unique verifiers
    pub unique_verifiers: u64,
    /// Anonymous verification count
    pub anonymous_verifications: u64,
    /// Latest verification timestamp
    pub last_verified_at: i64,
    /// Average verification interval (seconds)
    pub average_verification_interval: i64,
}

impl VerificationStats {
    /// Create new verification statistics
    pub fn new() -> Self {
        Self {
            total_verifications: 0,
            unique_verifiers: 0,
            anonymous_verifications: 0,
            last_verified_at: 0,
            average_verification_interval: 0,
        }
    }
    
    /// Update verification statistics
    pub fn update(&mut self, is_anonymous: bool, current_timestamp: i64) {
        let previous_count = self.total_verifications;
        self.total_verifications += 1;
        
        if is_anonymous {
            self.anonymous_verifications += 1;
        } else {
            self.unique_verifiers += 1;
        }
        
        // Calculate average verification interval
        if previous_count > 0 && self.last_verified_at > 0 {
            let interval = current_timestamp - self.last_verified_at;
            self.average_verification_interval = 
                (self.average_verification_interval * (previous_count as i64) + interval) / (self.total_verifications as i64);
        }
        
        self.last_verified_at = current_timestamp;
    }
    
    /// Calculate verification credibility score
    pub fn credibility_score(&self) -> u64 {
        let base_score = (self.total_verifications * 10).min(500);
        let diversity_bonus = (self.unique_verifiers * 5).min(200);
        let recent_activity_bonus = if self.last_verified_at > 0 {
            let days_since_last = (Clock::get().unwrap().unix_timestamp - self.last_verified_at) / 86400;
            if days_since_last <= 30 { 100 } else if days_since_last <= 90 { 50 } else { 0 }
        } else { 0 };
        
        (base_score + diversity_bonus + recent_activity_bonus).min(1000)
    }
} 