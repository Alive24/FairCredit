use anchor_lang::prelude::*;

/// Provider assessment by a verifier
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct ProviderAssessment {
    /// Provider wallet address
    pub provider: Pubkey,
    /// Whether this provider is suspended by this verifier
    pub is_suspended: bool,
    /// Reputation score assigned by this verifier (0-100)
    pub reputation_score: Option<u64>,
    /// Last updated timestamp
    pub updated_at: i64,
    /// Optional note from verifier
    #[max_len(200)]
    pub note: Option<String>,
}

/// Verifier state
/// Each verifier maintains their own assessment of providers
#[account]
#[derive(InitSpace)]
pub struct Verifier {
    /// Verifier wallet address
    pub wallet: Pubkey,
    /// List of provider assessments by this verifier
    #[max_len(10)]
    pub provider_assessments: Vec<ProviderAssessment>,
    /// Registration timestamp
    pub registered_at: i64,
}

impl Verifier {
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "verifier";
    
    /// Find provider assessment by provider key
    fn find_assessment(&self, provider: &Pubkey) -> Option<usize> {
        self.provider_assessments.iter().position(|a| a.provider == *provider)
    }
    
    /// Get or create provider assessment
    fn get_or_create_assessment(&mut self, provider: Pubkey) -> &mut ProviderAssessment {
        if let Some(index) = self.find_assessment(&provider) {
            &mut self.provider_assessments[index]
        } else {
            let assessment = ProviderAssessment {
                provider,
                is_suspended: false,
                reputation_score: None,
                updated_at: Clock::get().unwrap().unix_timestamp,
                note: None,
            };
            self.provider_assessments.push(assessment);
            self.provider_assessments.last_mut().unwrap()
        }
    }
    
    /// Check if provider is suspended by this verifier
    pub fn is_provider_suspended(&self, provider: &Pubkey) -> bool {
        self.find_assessment(provider)
            .map(|index| self.provider_assessments[index].is_suspended)
            .unwrap_or(false)
    }
    
    /// Suspend provider
    pub fn suspend_provider(&mut self, provider: Pubkey) -> Result<()> {
        let assessment = self.get_or_create_assessment(provider);
        assessment.is_suspended = true;
        assessment.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    /// Unsuspend provider
    pub fn unsuspend_provider(&mut self, provider: &Pubkey) -> Result<()> {
        if let Some(index) = self.find_assessment(provider) {
            self.provider_assessments[index].is_suspended = false;
            self.provider_assessments[index].updated_at = Clock::get()?.unix_timestamp;
        }
        Ok(())
    }
    
    /// Set provider reputation score
    pub fn set_provider_reputation(&mut self, provider: Pubkey, score: u64, note: Option<String>) -> Result<()> {
        let assessment = self.get_or_create_assessment(provider);
        assessment.reputation_score = Some(score);
        assessment.note = note;
        assessment.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    /// Get provider reputation score
    pub fn get_provider_reputation(&self, provider: &Pubkey) -> Option<u64> {
        self.find_assessment(provider)
            .and_then(|index| self.provider_assessments[index].reputation_score)
    }
} 