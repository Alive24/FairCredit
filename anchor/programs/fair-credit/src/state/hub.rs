use anchor_lang::prelude::*;

/// Hub state account - acts as a curated registry.
/// Hub accepts Providers; Providers create Courses which Hub must accept to be usable.
/// Endorsers are set by each Provider and do not require Hub acceptance.
#[account]
#[derive(InitSpace)]
pub struct Hub {
    /// Hub authority (can be multisig or DAO in future)
    pub authority: Pubkey,
    /// List of accepted provider wallets
    #[max_len(50)]
    pub accepted_providers: Vec<Pubkey>,
    /// List of accepted course IDs (courses from accepted providers; must be accepted to be usable)
    #[max_len(100, 32)]
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
    /// Minimum reputation score for auto-acceptance
    pub min_reputation_score: u64,
}

impl Default for HubConfig {
    fn default() -> Self {
        Self {
            require_provider_approval: true,
            min_reputation_score: 70,
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

    /// Check if a provider is accepted
    pub fn is_provider_accepted(&self, provider: &Pubkey) -> bool {
        self.accepted_providers.contains(provider)
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
