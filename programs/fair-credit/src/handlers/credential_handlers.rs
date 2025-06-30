use anchor_lang::prelude::*;
use crate::state::*;
use crate::types::{CredentialStatus, CredentialMetadata};

// Simplified credential handlers that work with existing credential system

#[derive(Accounts)]
#[instruction(credential_id: u64)]
pub struct CreateCredential<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = Credential::space(),
        seeds = [Credential::SEED_PREFIX.as_bytes(), &credential_id.to_le_bytes()],
        bump
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider.wallet.as_ref()],
        bump,
        constraint = provider.wallet == provider_authority.key()
    )]
    pub provider: Account<'info, Provider>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
    /// CHECK: Student wallet address
    pub student_wallet: AccountInfo<'info>,
    /// CHECK: Mentor wallet address  
    pub mentor_wallet: AccountInfo<'info>,
    /// CHECK: NFT mint address
    pub nft_mint: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndorseCredential<'info> {
    #[account(
        mut,
        seeds = [Credential::SEED_PREFIX.as_bytes(), &credential.id.to_le_bytes()],
        bump,
        constraint = credential.mentor_wallet == mentor.key()
    )]
    pub credential: Account<'info, Credential>,
    #[account(mut)]
    pub mentor: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyCredential<'info> {
    #[account(
        mut,
        seeds = [Credential::SEED_PREFIX.as_bytes(), &credential.id.to_le_bytes()],
        bump
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        init,
        payer = verifier,
        space = VerificationRecord::space(),
        seeds = [VerificationRecord::SEED_PREFIX.as_bytes(), &credential.id.to_le_bytes(), verifier.key().as_ref()],
        bump
    )]
    pub verification_record: Account<'info, VerificationRecord>,
    #[account(mut)]
    pub verifier: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_credential(
    ctx: Context<CreateCredential>,
    credential_id: u64,
    title: String,
    description: String,
    skills_acquired: Vec<String>,
    research_output: Option<String>,
    mentor_endorsement: String,
    completion_date: i64,
    ipfs_hash: String,
) -> Result<()> {
    let credential = &mut ctx.accounts.credential;
    let clock = Clock::get()?;
    
    credential.id = credential_id;
    credential.created = clock.unix_timestamp;
    credential.updated = clock.unix_timestamp;
    credential.student_wallet = ctx.accounts.student_wallet.key();
    credential.mentor_wallet = ctx.accounts.mentor_wallet.key();
    credential.provider_wallet = ctx.accounts.provider_authority.key();
    credential.nft_mint = ctx.accounts.nft_mint.key();
    credential.verification_count = 0;
    credential.status = CredentialStatus::Pending;
    
    credential.metadata = CredentialMetadata {
        title,
        description,
        skills_acquired,
        research_output,
        mentor_endorsement,
        completion_date,
        ipfs_hash,
    };

    Ok(())
}

pub fn endorse_credential(
    ctx: Context<EndorseCredential>,
    endorsement_message: String,
) -> Result<()> {
    let credential = &mut ctx.accounts.credential;
    
    // Update mentor endorsement
    credential.metadata.mentor_endorsement = endorsement_message;
    credential.update_status(CredentialStatus::Endorsed);
    
    Ok(())
}

pub fn verify_credential(
    ctx: Context<VerifyCredential>,
) -> Result<()> {
    let credential = &mut ctx.accounts.credential;
    let verification_record = &mut ctx.accounts.verification_record;
    let verifier = &ctx.accounts.verifier;
    let clock = Clock::get()?;
    
    // Update credential verification stats
    credential.increment_verification_count();
    
    // Initialize verification record fields directly
    verification_record.credential_id = credential.id;
    verification_record.verifier_wallet = Some(verifier.key());
    verification_record.verified_at = clock.unix_timestamp;
    verification_record.verification_count = 1;

    Ok(())
}

pub fn generate_user_token(
    _ctx: Context<GenerateUserToken>,
    user_id: String,
) -> Result<String> {
    // In a real implementation, this would generate a JWT or similar token
    // For now, we'll return a simple concatenated string
    let token = format!("{}_{}", user_id, Clock::get()?.unix_timestamp);
    Ok(token)
}

#[derive(Accounts)]
pub struct GenerateUserToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
} 