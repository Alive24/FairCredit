use anchor_lang::prelude::*;

/// Credential metadata structure
/// Contains detailed credential information, with some data stored on IPFS
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct CredentialMetadata {
    /// Credential title
    #[max_len(100)]
    pub title: String,
    /// Detailed description
    #[max_len(500)]
    pub description: String,
    /// List of acquired skills
    #[max_len(10, 50)]
    pub skills_acquired: Vec<String>,
    /// Research output (optional)
    #[max_len(200)]
    pub research_output: Option<String>,
    /// Mentor endorsement content
    #[max_len(300)]
    pub mentor_endorsement: String,
    /// Completion date timestamp
    pub completion_date: i64,
    /// IPFS hash for storing additional metadata
    #[max_len(64)]
    pub ipfs_hash: String,
}

/// Credential status enumeration
/// Tracks status changes throughout the credential's lifecycle
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
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