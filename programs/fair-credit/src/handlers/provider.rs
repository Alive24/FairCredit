use anchor_lang::prelude::*;
use crate::state::{Provider, Verifier};
use crate::types::ProviderError;

#[derive(Accounts)]
pub struct InitializeProvider<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = Provider::space(),
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider_authority.key().as_ref()],
        bump
    )]
    pub provider_account: Account<'info, Provider>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeVerifier<'info> {
    #[account(
        init,
        payer = verifier_authority,
        space = Verifier::space(),
        seeds = [Verifier::SEED_PREFIX.as_bytes(), verifier_authority.key().as_ref()],
        bump
    )]
    pub verifier_account: Account<'info, Verifier>,
    #[account(mut)]
    pub verifier_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SuspendProvider<'info> {
    #[account(
        mut,
        seeds = [Verifier::SEED_PREFIX.as_bytes(), verifier.key().as_ref()],
        bump
    )]
    pub verifier_account: Account<'info, Verifier>,
    #[account(mut)]
    pub verifier: Signer<'info>,
    /// CHECK: Provider being suspended
    pub provider_to_suspend: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UnsuspendProvider<'info> {
    #[account(
        mut,
        seeds = [Verifier::SEED_PREFIX.as_bytes(), verifier.key().as_ref()],
        bump
    )]
    pub verifier_account: Account<'info, Verifier>,
    #[account(mut)]
    pub verifier: Signer<'info>,
    /// CHECK: Provider being unsuspended
    pub provider_to_unsuspend: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SetProviderReputation<'info> {
    #[account(
        mut,
        seeds = [Verifier::SEED_PREFIX.as_bytes(), verifier.key().as_ref()],
        bump
    )]
    pub verifier_account: Account<'info, Verifier>,
    #[account(mut)]
    pub verifier: Signer<'info>,
    /// CHECK: Provider being rated
    pub provider: AccountInfo<'info>,
}

pub fn initialize_provider(
    ctx: Context<InitializeProvider>,
    name: String,
    description: String,
    website: String,
    email: String,
    provider_type: String,
) -> Result<()> {
    let provider = &mut ctx.accounts.provider_account;
    let clock = Clock::get()?;

    provider.wallet = ctx.accounts.provider_authority.key();
    provider.name = name;
    provider.description = description;
    provider.website = website;
    provider.email = email;
    provider.provider_type = provider_type;
    provider.registered_at = clock.unix_timestamp;

    Ok(())
}

pub fn initialize_verifier(
    ctx: Context<InitializeVerifier>,
) -> Result<()> {
    let verifier = &mut ctx.accounts.verifier_account;
    let clock = Clock::get()?;

    verifier.wallet = ctx.accounts.verifier_authority.key();
    verifier.provider_assessments = Vec::new();
    verifier.registered_at = clock.unix_timestamp;

    Ok(())
}

pub fn suspend_provider(
    ctx: Context<SuspendProvider>,
) -> Result<()> {
    // Prevent self-suspension
    if ctx.accounts.verifier.key() == ctx.accounts.provider_to_suspend.key() {
        return Err(ProviderError::CannotSuspendSelf.into());
    }

    let verifier_account = &mut ctx.accounts.verifier_account;
    verifier_account.suspend_provider(ctx.accounts.provider_to_suspend.key())?;

    Ok(())
}

pub fn unsuspend_provider(
    ctx: Context<UnsuspendProvider>,
) -> Result<()> {
    let verifier_account = &mut ctx.accounts.verifier_account;
    verifier_account.unsuspend_provider(&ctx.accounts.provider_to_unsuspend.key())?;

    Ok(())
}

pub fn set_provider_reputation(
    ctx: Context<SetProviderReputation>,
    reputation_score: u64,
    note: Option<String>,
) -> Result<()> {
    // Validate reputation score
    if reputation_score > 100 {
        return Err(ProviderError::InvalidReputationScore.into());
    }

    // Check note length if provided
    if let Some(ref note_text) = note {
        if note_text.len() > 200 {
            return Err(ProviderError::NoteTooLong.into());
        }
    }

    let verifier_account = &mut ctx.accounts.verifier_account;
    verifier_account.set_provider_reputation(
        ctx.accounts.provider.key(),
        reputation_score,
        note
    )?;

    Ok(())
} 