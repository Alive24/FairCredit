use anchor_lang::prelude::*;

/// Hub state account - acts as a curated registry
/// Maintains lists of accepted providers and endorsers for website filtering
#[account]
#[derive(InitSpace)]
pub struct Hub {
    /// Hub authority (can be multisig or DAO in future)
    pub authority: Pubkey,
    /// List of accepted provider wallets
    #[max_len(1000)]
    pub accepted_providers: Vec<Pubkey>,
    /// List of accepted endorser/mentor wallets
    #[max_len(1000)]
    pub accepted_endorsers: Vec<Pubkey>,
    /// List of accepted course IDs (courses from accepted providers)
    #[max_len(2000, 32)]
    pub accepted_courses: Vec<String>,
    /// Hub creation timestamp
    pub created_at: i64,
    /// Last update timestamp
    pub updated_at: i64,
    /// Hub configuration flags
    pub config: HubConfig,
}

/// Hub configuration
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct HubConfig {
    /// Whether new providers need approval
    pub require_provider_approval: bool,
    /// Whether new endorsers need approval
    pub require_endorser_approval: bool,
    /// Minimum reputation score for auto-acceptance
    pub min_reputation_score: u64,
    /// Whether to allow self-endorsement
    pub allow_self_endorsement: bool,
}

impl Default for HubConfig {
    fn default() -> Self {
        Self {
            require_provider_approval: true,
            require_endorser_approval: true,
            min_reputation_score: 70,
            allow_self_endorsement: false,
        }
    }
}

impl Hub {
    /// Seed prefix for PDA generation
    pub const SEED_PREFIX: &'static str = "hub";
    
    /// Add a provider to the accepted list
    pub fn add_provider(&mut self, provider: Pubkey) -> Result<()> {
        if !self.accepted_providers.contains(&provider) {
            self.accepted_providers.push(provider);
            self.updated_at = Clock::get()?.unix_timestamp;
        }
        Ok(())
    }
    
    /// Remove a provider from the accepted list
    pub fn remove_provider(&mut self, provider: &Pubkey) -> Result<()> {
        self.accepted_providers.retain(|p| p != provider);
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    /// Add an endorser to the accepted list
    pub fn add_endorser(&mut self, endorser: Pubkey) -> Result<()> {
        if !self.accepted_endorsers.contains(&endorser) {
            self.accepted_endorsers.push(endorser);
            self.updated_at = Clock::get()?.unix_timestamp;
        }
        Ok(())
    }
    
    /// Remove an endorser from the accepted list
    pub fn remove_endorser(&mut self, endorser: &Pubkey) -> Result<()> {
        self.accepted_endorsers.retain(|e| e != endorser);
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    /// Check if a provider is accepted
    pub fn is_provider_accepted(&self, provider: &Pubkey) -> bool {
        self.accepted_providers.contains(provider)
    }
    
    /// Check if an endorser is accepted
    pub fn is_endorser_accepted(&self, endorser: &Pubkey) -> bool {
        self.accepted_endorsers.contains(endorser)
    }
    
    /// Update hub configuration
    pub fn update_config(&mut self, config: HubConfig) -> Result<()> {
        self.config = config;
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    /// Add a course to the accepted list
    pub fn add_course(&mut self, course_id: String) -> Result<()> {
        if !self.accepted_courses.contains(&course_id) {
            self.accepted_courses.push(course_id);
            self.updated_at = Clock::get()?.unix_timestamp;
        }
        Ok(())
    }
    
    /// Remove a course from the accepted list
    pub fn remove_course(&mut self, course_id: &String) -> Result<()> {
        self.accepted_courses.retain(|c| c != course_id);
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    /// Check if a course is accepted
    pub fn is_course_accepted(&self, course_id: &String) -> bool {
        self.accepted_courses.contains(course_id)
    }
}