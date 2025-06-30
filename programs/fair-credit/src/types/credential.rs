use anchor_lang::prelude::*;

/// Credential metadata structure
/// Contains detailed credential information, with some data stored on IPFS
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CredentialMetadata {
    /// Credential title
    pub title: String,
    /// Detailed description
    pub description: String,
    /// List of acquired skills
    pub skills_acquired: Vec<String>,
    /// Research output (optional)
    pub research_output: Option<String>,
    /// Mentor endorsement content
    pub mentor_endorsement: String,
    /// Completion date timestamp
    pub completion_date: i64,
    /// IPFS hash for storing additional metadata
    pub ipfs_hash: String,
}

/// Credential status enumeration
/// Tracks status changes throughout the credential's lifecycle
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum CredentialStatus {
    /// Pending - Credential created but not yet endorsed by mentor
    Pending,
    /// Endorsed - Mentor has provided endorsement but NFT not yet minted
    Endorsed,
    /// Minted - NFT successfully minted to student wallet
    Minted,
    /// Verified - Credential has been verified by third parties
    Verified,
} 