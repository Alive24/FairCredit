# FairCredit Data Structures Documentation

This document describes the core data structures in the FairCredit smart contract and their usage.

## Overview

FairCredit is an educational credential system built on the Solana blockchain using the Anchor framework. The system contains three main data structures:

- **Credential**: Stores core information of academic credentials
- **Provider**: Manages educational provider information and reputation
- **VerificationRecord**: Tracks credential verification history

## Data Structure Details

### 1. Credential

```rust
#[account]
pub struct Credential {
    pub id: u64,                          // Unique credential identifier
    pub created: i64,                     // Creation timestamp
    pub updated: i64,                     // Last update timestamp
    pub student_wallet: Pubkey,           // Student wallet address
    pub mentor_wallet: Pubkey,            // Mentor wallet address
    pub provider_wallet: Pubkey,          // Educational provider wallet address
    pub nft_mint: Pubkey,                 // Associated NFT mint address
    pub metadata: CredentialMetadata,     // Detailed credential metadata
    pub verification_count: u64,          // Verification count statistics
    pub status: CredentialStatus,         // Current status
}
```

#### Credential Status (CredentialStatus)

- `Pending`: Pending - Credential created but not yet endorsed by mentor
- `Endorsed`: Endorsed - Mentor has provided endorsement but NFT not yet minted
- `Minted`: Minted - NFT successfully minted to student wallet
- `Verified`: Verified - Credential has been verified by third parties

#### Credential Metadata (CredentialMetadata)

```rust
pub struct CredentialMetadata {
    pub title: String,                    // Credential title
    pub description: String,              // Detailed description
    pub skills_acquired: Vec<String>,     // List of acquired skills
    pub research_output: Option<String>,  // Research output (optional)
    pub mentor_endorsement: String,       // Mentor endorsement content
    pub completion_date: i64,             // Completion date timestamp
    pub ipfs_hash: String,                // IPFS hash for storing additional metadata
}
```

### 2. Provider

```rust
#[account]
pub struct Provider {
    pub wallet: Pubkey,                   // Provider wallet address (serves as unique identifier)
    pub name: String,                     // Institution name
    pub description: String,              // Institution description
    pub verification_status: ProviderStatus, // Verification status
    pub credentials_issued: u64,          // Total number of credentials issued
    pub reputation_score: u64,            // Reputation score (0-100)
    pub registered_at: i64,               // Registration timestamp
}
```

#### Provider Status (ProviderStatus)

- `Pending`: Pending review - Provider has applied but not yet verified
- `Verified`: Verified - Provider is verified and can issue credentials
- `Suspended`: Suspended - Provider has been suspended for some reason

#### Trust Level (TrustLevel)

Automatically calculated based on provider's historical performance and reputation score:

- `New`: New institution
- `Fair`: Fair
- `Good`: Good
- `High`: High
- `Excellent`: Excellent

### 3. VerificationRecord

```rust
#[account]
pub struct VerificationRecord {
    pub credential_id: u64,               // Associated credential ID
    pub verifier_wallet: Option<Pubkey>,  // Verifier's wallet address (optional)
    pub verified_at: i64,                 // Verification timestamp
    pub verification_count: u64,          // Total verification count for this credential
}
```

#### Verification Frequency (VerificationFrequency)

Automatically categorized based on verification count:

- `First`: First verification
- `Low`: Low frequency verification (2-5 times)
- `Medium`: Medium frequency verification (6-20 times)
- `High`: High frequency verification (21-100 times)
- `VeryHigh`: Very high frequency verification (100+ times)

## Usage Examples

### Creating Educational Provider

```rust
let provider = Provider {
    wallet: provider_pubkey,
    name: "Scholars' Bridge Initiative".to_string(),
    description: "Research projects connecting A-Level students with PhD mentors".to_string(),
    verification_status: ProviderStatus::Pending,
    credentials_issued: 0,
    reputation_score: 75,
    registered_at: Clock::get()?.unix_timestamp,
};
```

### Creating Credential

```rust
let credential = Credential {
    id: 1,
    created: Clock::get()?.unix_timestamp,
    updated: Clock::get()?.unix_timestamp,
    student_wallet: student_pubkey,
    mentor_wallet: mentor_pubkey,
    provider_wallet: provider_pubkey,
    nft_mint: nft_mint_pubkey,
    metadata: CredentialMetadata {
        title: "Biochemistry Research Project".to_string(),
        description: "Protein structure research in collaboration with Imperial College PhD mentor".to_string(),
        skills_acquired: vec!["Experimental Design".to_string(), "Data Analysis".to_string()],
        research_output: Some("Published in Biochemistry Journal".to_string()),
        mentor_endorsement: "Excellent research capabilities and innovative thinking".to_string(),
        completion_date: Clock::get()?.unix_timestamp,
        ipfs_hash: "QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX".to_string(),
    },
    verification_count: 0,
    status: CredentialStatus::Pending,
};
```

### Verifying Credential

```rust
let verification = VerificationRecord::new(
    credential_id,
    Some(verifier_pubkey), // or None for anonymous verification
);
```

## Account Space Calculation

- `Credential::SPACE`: ~768 bytes (base structure + 512 bytes for strings)
- `Provider::SPACE`: ~344 bytes (base structure + 256 bytes for strings)
- `VerificationRecord::SPACE`: ~88 bytes (base structure + 64 bytes extra space)

## Helper Functions

### Credential Related

- `credential.update_status(new_status)`: Update credential status
- `credential.increment_verification_count()`: Increment verification count

### Provider Related

- `provider.can_issue_credentials()`: Check if provider can issue credentials
- `provider.trust_level()`: Get trust level
- `provider.increment_credentials_issued()`: Increment issued credentials count

### Verification Related

- `verification.is_anonymous_verification()`: Check if verification is anonymous
- `verification.verification_frequency()`: Get verification frequency level

## Important Notes

1. **String Length Limits**: Ensure string fields don't exceed allocated space limits
2. **Timestamps**: All timestamps use Unix timestamp format
3. **Account Space**: Ensure sufficient space is allocated when creating accounts
4. **Status Transitions**: Credential status should transition in logical order (Pending → Endorsed → Minted → Verified)
5. **Permission Control**: Only verified providers can issue credentials

## Extensibility

This data structure design considers future extensibility:

- Support for multiple types of credentials
- Can add more metadata fields
- Support for complex reputation systems
- Reserved interfaces for IPFS integration
