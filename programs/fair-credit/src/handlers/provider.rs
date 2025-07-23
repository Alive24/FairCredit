use anchor_lang::prelude::*;
use crate::state::{Provider, Verifier};
use crate::types::ProviderError;
use crate::events::*;

#[derive(Accounts)]
pub struct InitializeProvider<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Provider::INIT_SPACE,
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
        space = 8 + Verifier::INIT_SPACE,
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
    provider.name = name.clone();
    provider.description = description;
    provider.website = website;
    provider.email = email;
    provider.provider_type = provider_type.clone();
    provider.registered_at = clock.unix_timestamp;

    // Emit provider registered event
    emit!(ProviderRegistered {
        provider: provider.wallet,
        name,
        provider_type,
        timestamp: clock.unix_timestamp,
    });

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

    // Emit verifier registered event
    emit!(VerifierRegistered {
        verifier: verifier.wallet,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn suspend_provider(
    ctx: Context<SuspendProvider>,
) -> Result<()> {
    // Prevent self-suspension
    require_keys_neq!(
        ctx.accounts.verifier.key(), 
        ctx.accounts.provider_to_suspend.key(),
        ProviderError::CannotSuspendSelf
    );

    let verifier_account = &mut ctx.accounts.verifier_account;
    let provider_key = ctx.accounts.provider_to_suspend.key();
    let clock = Clock::get()?;
    
    verifier_account.suspend_provider(provider_key)?;

    // Emit provider suspended event
    emit!(ProviderSuspended {
        verifier: verifier_account.wallet,
        provider: provider_key,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn unsuspend_provider(
    ctx: Context<UnsuspendProvider>,
) -> Result<()> {
    let verifier_account = &mut ctx.accounts.verifier_account;
    let provider_key = ctx.accounts.provider_to_unsuspend.key();
    let clock = Clock::get()?;
    
    verifier_account.unsuspend_provider(&provider_key)?;

    // Emit provider unsuspended event
    emit!(ProviderUnsuspended {
        verifier: verifier_account.wallet,
        provider: provider_key,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn set_provider_reputation(
    ctx: Context<SetProviderReputation>,
    reputation_score: u64,
    note: Option<String>,
) -> Result<()> {
    // Validate reputation score
    require!(reputation_score <= 100, ProviderError::InvalidReputationScore);

    // Check note length if provided
    if let Some(ref note_text) = note {
        require!(note_text.len() <= 200, ProviderError::NoteTooLong);
    }

    let verifier_account = &mut ctx.accounts.verifier_account;
    let provider_key = ctx.accounts.provider.key();
    let clock = Clock::get()?;
    
    verifier_account.set_provider_reputation(
        provider_key,
        reputation_score,
        note.clone()
    )?;

    // Emit provider reputation updated event
    emit!(ProviderReputationUpdated {
        verifier: verifier_account.wallet,
        provider: provider_key,
        reputation_score,
        note,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
} 