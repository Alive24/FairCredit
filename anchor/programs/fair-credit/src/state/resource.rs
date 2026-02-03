use crate::types::{ResourceError, ResourceKind, ResourceStatus, SubmissionStatus};
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Resource {
    /// Creation timestamp (also part of PDA seeds)
    pub created: i64,
    /// Last update timestamp
    pub updated: i64,
    #[max_len(128)]
    pub name: String,
    pub kind: ResourceKind,
    pub status: ResourceStatus,
    /// Optional external system identifier
    #[max_len(32)]
    pub external_id: Option<String>,
    /// Estimated workload in minutes
    pub workload: Option<u32>,
    /// Course account (PDA) this resource belongs to
    pub course: Pubkey,
    /// Attached asset PDAs
    #[max_len(20)]
    pub assets: Vec<Pubkey>,
    /// Free-form tags for discovery/filtering
    #[max_len(10, 32)]
    pub tags: Vec<String>,
    /// Optional Nostr "d" tag used to locate the latest editable content event
    #[max_len(96)]
    pub nostr_d_tag: Option<String>,
    /// Nostr author public key bytes (32 bytes). All-zero means "not set".
    pub nostr_author_pubkey: [u8; 32],
    /// Optional Walrus blob identifier for the finalized content bundle
    #[max_len(128)]
    pub walrus_blob_id: Option<String>,
    /// Wallet that created this resource and is allowed to update off-chain pointers
    pub owner: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Asset {
    /// Creation timestamp (also part of PDA seeds)
    pub created: i64,
    /// Last update timestamp
    pub updated: i64,
    #[max_len(64)]
    pub content_type: Option<String>,
    #[max_len(256)]
    pub file_name: Option<String>,
    pub file_size: Option<u64>,
    /// Associated resource PDA (Pubkey::default() if standalone)
    pub resource: Pubkey,
    /// Optional Nostr "d" tag used to locate the latest editable content event
    #[max_len(96)]
    pub nostr_d_tag: Option<String>,
    /// Nostr author public key bytes (32 bytes). All-zero means "not set".
    pub nostr_author_pubkey: [u8; 32],
    /// Optional Walrus blob identifier for the asset file
    #[max_len(128)]
    pub walrus_blob_id: Option<String>,
    /// Wallet that created this asset and is allowed to update off-chain pointers
    pub owner: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Submission {
    /// Submission timestamp (also part of PDA seeds)
    pub submitted_at: i64,
    /// Last update timestamp
    pub updated: i64,
    /// Resource this submission is for
    pub resource: Pubkey,
    /// Student wallet
    pub student: Pubkey,
    /// Attached asset PDAs
    #[max_len(10)]
    pub assets: Vec<Pubkey>,
    /// Evidence asset PDAs
    #[max_len(10)]
    pub evidence_assets: Vec<Pubkey>,
    pub status: SubmissionStatus,
    pub grade: Option<f64>,
    #[max_len(512)]
    pub feedback: Option<String>,
    pub graded_by: Option<Pubkey>,
    pub graded_at: Option<i64>,
    /// Optional Nostr "d" tag used to locate the latest editable content event
    #[max_len(96)]
    pub nostr_d_tag: Option<String>,
    /// Nostr author public key bytes (32 bytes). All-zero means "not set".
    pub nostr_author_pubkey: [u8; 32],
    /// Optional Walrus blob identifier for the submission content bundle
    #[max_len(128)]
    pub walrus_blob_id: Option<String>,
}

impl Resource {
    pub const SEED_PREFIX: &'static str = "resource";

    pub fn add_asset(&mut self, asset: Pubkey) -> Result<()> {
        require!(self.assets.len() < 20, ResourceError::TooManyAssets);
        self.assets.push(asset);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_tag(&mut self, tag: String) -> Result<()> {
        require!(self.tags.len() < 10, ResourceError::TooManyTags);
        require!(!self.tags.contains(&tag), ResourceError::DuplicateTag);
        self.tags.push(tag);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_status(&mut self, status: ResourceStatus) -> Result<()> {
        self.status = status;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn is_nostr_ref_set(&self) -> bool {
        self.nostr_d_tag.is_some() || self.nostr_author_pubkey != [0u8; 32]
    }
}

impl Asset {
    pub const SEED_PREFIX: &'static str = "asset";

    pub fn is_image(&self) -> bool {
        if let Some(content_type) = &self.content_type {
            content_type.starts_with("image/")
        } else {
            false
        }
    }

    pub fn is_document(&self) -> bool {
        if let Some(content_type) = &self.content_type {
            matches!(
                content_type.as_str(),
                "application/pdf" | "application/msword" | "text/plain"
            )
        } else {
            false
        }
    }

    pub fn is_nostr_ref_set(&self) -> bool {
        self.nostr_d_tag.is_some() || self.nostr_author_pubkey != [0u8; 32]
    }
}

impl Submission {
    pub const SEED_PREFIX: &'static str = "submission";

    pub fn grade_submission(
        &mut self,
        grade: f64,
        feedback: Option<String>,
        graded_by: Pubkey,
    ) -> Result<()> {
        require_gte!(grade, 0.0, ResourceError::InvalidGrade);
        require!(grade <= 100.0, ResourceError::InvalidGrade);
        self.grade = Some(grade);
        self.feedback = feedback;
        self.graded_by = Some(graded_by);
        self.graded_at = Some(Clock::get()?.unix_timestamp);
        self.updated = Clock::get()?.unix_timestamp;
        self.status = SubmissionStatus::Graded;
        Ok(())
    }

    pub fn return_for_revision(&mut self, feedback: String) -> Result<()> {
        self.feedback = Some(feedback);
        self.updated = Clock::get()?.unix_timestamp;
        self.status = SubmissionStatus::Returned;
        Ok(())
    }

    pub fn accept_submission(&mut self) -> Result<()> {
        require!(
            self.status == SubmissionStatus::Graded,
            ResourceError::SubmissionNotGraded
        );
        self.updated = Clock::get()?.unix_timestamp;
        self.status = SubmissionStatus::Accepted;
        Ok(())
    }

    pub fn add_asset(&mut self, asset: Pubkey) -> Result<()> {
        require!(self.assets.len() < 10, ResourceError::TooManyAssets);
        self.assets.push(asset);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_evidence_asset(&mut self, asset: Pubkey) -> Result<()> {
        require!(
            self.evidence_assets.len() < 10,
            ResourceError::TooManyAssets
        );
        self.evidence_assets.push(asset);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn is_nostr_ref_set(&self) -> bool {
        self.nostr_d_tag.is_some() || self.nostr_author_pubkey != [0u8; 32]
    }
}
