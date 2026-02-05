use crate::types::{CourseError, CourseStatus};
use anchor_lang::prelude::*;

/// One module in a course: points to a resource and its weight (percentage).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct CourseModule {
    pub resource: Pubkey,
    pub percentage: u8, // 0-100
}

#[account]
#[derive(InitSpace)]
pub struct Course {
    /// Creation timestamp used in PDA seeds (hub + provider + creation_timestamp)
    pub creation_timestamp: i64,
    pub created: i64,
    pub updated: i64,
    pub provider: Pubkey,
    pub status: CourseStatus,
    #[max_len(200)]
    pub rejection_reason: Option<String>,
    #[max_len(64)]
    pub name: String,
    #[max_len(256)]
    pub description: String,
    /// List of modules: each points to a resource (PDA) and has a percentage weight
    #[max_len(20)]
    pub modules: Vec<CourseModule>,
    pub workload_required: u32,
    pub workload: u32,
    #[max_len(32)]
    pub college_id: String,
    #[max_len(32)]
    pub degree_id: Option<String>,
    /// Optional Nostr "d" tag used to locate the latest editable course metadata event
    #[max_len(96)]
    pub nostr_d_tag: Option<String>,
    /// Nostr author public key bytes (32 bytes). All-zero means "not set".
    pub nostr_author_pubkey: [u8; 32],
    /// Credential PDAs approved by this provider for this course
    #[max_len(200)]
    pub approved_credentials: Vec<Pubkey>,
}

impl Course {
    pub const SEED_PREFIX: &'static str = "course";

    pub fn add_module(&mut self, resource: Pubkey, percentage: u8) -> Result<()> {
        require!(self.modules.len() < 20, CourseError::TooManyModules);
        require!(percentage <= 100, CourseError::InvalidProgress);
        self.modules.push(CourseModule {
            resource,
            percentage,
        });
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_status(
        &mut self,
        status: CourseStatus,
        rejection_reason: Option<String>,
    ) -> Result<()> {
        self.status = status;
        self.rejection_reason = rejection_reason;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    /// Add a credential to the approved list (provider confirms after endorser signs)
    pub fn add_approved_credential(&mut self, credential_pubkey: Pubkey) -> Result<()> {
        require!(
            !self.approved_credentials.contains(&credential_pubkey),
            CourseError::CredentialAlreadyApproved
        );
        require!(
            self.approved_credentials.len() < 200,
            CourseError::TooManyApprovedCredentials
        );
        self.approved_credentials.push(credential_pubkey);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn is_nostr_ref_set(&self) -> bool {
        self.nostr_d_tag.is_some() || self.nostr_author_pubkey != [0u8; 32]
    }
}
