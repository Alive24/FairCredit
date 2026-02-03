use anchor_lang::prelude::*;

/// Event emitted when a new provider is registered
#[event]
pub struct ProviderRegistered {
    pub provider: Pubkey,
    pub name: String,
    pub provider_type: String,
    pub timestamp: i64,
}

#[event]
pub struct ProviderSuspended {
    pub provider: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a provider suspension is lifted
#[event]
pub struct ProviderUnsuspended {
    pub provider: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ProviderReputationUpdated {
    pub provider: Pubkey,
    pub reputation_score: u64,
    pub note: Option<String>,
    pub timestamp: i64,
}

/// Event emitted when a credential is created
#[event]
pub struct CredentialCreated {
    pub credential: Pubkey,
    pub provider: Pubkey,
    pub student: Pubkey,
    pub mentor: Pubkey,
    pub title: String,
    pub timestamp: i64,
}

/// Event emitted when a credential is endorsed
#[event]
pub struct CredentialEndorsed {
    pub credential: Pubkey,
    pub mentor: Pubkey,
    pub endorsement: String,
    pub timestamp: i64,
}

/// Event emitted when a credential is verified
#[event]
pub struct CredentialVerified {
    pub credential: Pubkey,
    pub verification_count: u64,
    pub timestamp: i64,
}

/// Event emitted when a credential NFT is minted
#[event]
pub struct CredentialMinted {
    pub credential: Pubkey,
    pub student: Pubkey,
    pub mint: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a course is created
#[event]
pub struct CourseCreated {
    pub course: Pubkey,
    pub provider: Pubkey,
    pub name: String,
    pub workload_required: u32,
    pub timestamp: i64,
}

/// Event emitted when a resource is added
#[event]
pub struct ResourceAdded {
    pub resource_id: String,
    pub course: Pubkey,
    pub provider: Pubkey,
    pub name: String,
    pub kind: String,
    pub timestamp: i64,
}

/// Event emitted when an activity is created
#[event]
pub struct ActivityCreated {
    pub activity: Pubkey,
    pub student: Pubkey,
    pub provider: Pubkey,
    pub course: Option<Pubkey>,
    pub kind: String,
    pub timestamp: i64,
}

/// Event emitted when an activity is graded
#[event]
pub struct ActivityGraded {
    pub activity: Pubkey,
    pub grade: f64,
    pub teacher: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when hub is initialized
#[event]
pub struct HubInitialized {
    pub authority: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when hub config is updated
#[event]
pub struct HubConfigUpdated {
    pub authority: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a provider is accepted by hub
#[event]
pub struct ProviderAccepted {
    pub hub_authority: Pubkey,
    pub provider: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a provider is removed from hub
#[event]
pub struct ProviderRemovedFromHub {
    pub hub_authority: Pubkey,
    pub provider: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a provider adds an endorser (provider-managed; no Hub acceptance)
#[event]
pub struct ProviderEndorserAdded {
    pub provider: Pubkey,
    pub endorser: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a provider removes an endorser
#[event]
pub struct ProviderEndorserRemoved {
    pub provider: Pubkey,
    pub endorser: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when hub authority is transferred
#[event]
pub struct HubAuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a course is accepted by hub
#[event]
pub struct CourseAccepted {
    pub hub_authority: Pubkey,
    pub course: Pubkey,
    pub provider: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a course is removed from hub
#[event]
pub struct CourseRemovedFromHub {
    pub hub_authority: Pubkey,
    pub course: Pubkey,
    pub timestamp: i64,
}
