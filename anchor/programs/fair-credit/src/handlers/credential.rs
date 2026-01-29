use crate::events::*;
use crate::state::*;
use crate::types::{CredentialMetadata, CredentialStatus};
use anchor_lang::prelude::*;

// Simplified credential handlers that work with existing credential system

#[derive(Accounts)]
#[instruction(credential_id: u64)]
pub struct CreateCredential<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Credential::INIT_SPACE,
        seeds = [Credential::SEED_PREFIX.as_bytes(), &credential_id.to_le_bytes()],
        bump
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.wallet.as_ref(),
        ],
        bump,
        constraint = provider.wallet == provider_authority.key()
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
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
        title: title.clone(),
        description,
        skills_acquired,
        research_output,
        mentor_endorsement,
        completion_date,
        ipfs_hash,
    };

    // Emit credential created event
    emit!(CredentialCreated {
        credential_id,
        provider: credential.provider_wallet,
        student: credential.student_wallet,
        mentor: credential.mentor_wallet,
        title,
        timestamp: clock.unix_timestamp,
    });

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

pub fn generate_user_token(_ctx: Context<GenerateUserToken>, user_id: String) -> Result<String> {
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
