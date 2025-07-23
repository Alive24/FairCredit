use anchor_lang::prelude::*;

/// Event emitted when a new provider is registered
#[event]
pub struct ProviderRegistered {
    pub provider: Pubkey,
    pub name: String,
    pub provider_type: String,
    pub timestamp: i64,
}

/// Event emitted when a new verifier is registered
#[event]
pub struct VerifierRegistered {
    pub verifier: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a provider is suspended by a verifier
#[event]
pub struct ProviderSuspended {
    pub verifier: Pubkey,
    pub provider: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a provider suspension is lifted
#[event]
pub struct ProviderUnsuspended {
    pub verifier: Pubkey,
    pub provider: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when a verifier updates provider reputation
#[event]
pub struct ProviderReputationUpdated {
    pub verifier: Pubkey,
    pub provider: Pubkey,
    pub reputation_score: u64,
    pub note: Option<String>,
    pub timestamp: i64,
}

/// Event emitted when a credential is created
#[event]
pub struct CredentialCreated {
    pub credential_id: u64,
    pub provider: Pubkey,
    pub student: Pubkey,
    pub mentor: Pubkey,
    pub title: String,
    pub timestamp: i64,
}

/// Event emitted when a credential is endorsed
#[event]
pub struct CredentialEndorsed {
    pub credential_id: u64,
    pub mentor: Pubkey,
    pub endorsement: String,
    pub timestamp: i64,
}

/// Event emitted when a credential is verified
#[event]
pub struct CredentialVerified {
    pub credential_id: u64,
    pub verifier: Pubkey,
    pub verification_count: u64,
    pub timestamp: i64,
}

/// Event emitted when a course is created
#[event]
pub struct CourseCreated {
    pub course_id: String,
    pub provider: Pubkey,
    pub name: String,
    pub workload_required: u32,
    pub timestamp: i64,
}

/// Event emitted when a resource is added
#[event]
pub struct ResourceAdded {
    pub resource_id: String,
    pub course_id: String,
    pub provider: Pubkey,
    pub name: String,
    pub kind: String,
    pub timestamp: i64,
}

/// Event emitted when an activity is created
#[event]
pub struct ActivityCreated {
    pub activity_id: String,
    pub user_id: String,
    pub course_id: Option<String>,
    pub kind: String,
    pub timestamp: i64,
}

/// Event emitted when an activity is graded
#[event]
pub struct ActivityGraded {
    pub activity_id: String,
    pub grade: f64,
    pub teacher: Pubkey,
    pub timestamp: i64,
}