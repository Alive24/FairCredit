use anchor_lang::prelude::*;
use crate::state::{Provider};
use crate::types::{ProviderStatus};

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
pub struct UpdateProviderStatus<'info> {
    #[account(
        mut,
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider_account.wallet.as_ref()],
        bump,
        constraint = provider_account.wallet == admin_authority.key()
    )]
    pub provider_account: Account<'info, Provider>,
    #[account(mut)]
    pub admin_authority: Signer<'info>,
}


pub fn initialize_provider(
    ctx: Context<InitializeProvider>,
    name: String,
    description: String,
) -> Result<()> {
    let provider = &mut ctx.accounts.provider_account;
    let clock = Clock::get()?;

    provider.wallet = ctx.accounts.provider_authority.key();
    provider.name = name;
    provider.description = description;
    provider.verification_status = ProviderStatus::Pending;
    provider.credentials_issued = 0;
    provider.reputation_score = 50; // Starting reputation
    provider.registered_at = clock.unix_timestamp;

    Ok(())
}

pub fn update_provider_status(
    ctx: Context<UpdateProviderStatus>,
    new_status: ProviderStatus,
) -> Result<()> {
    let provider = &mut ctx.accounts.provider_account;
    provider.update_verification_status(new_status);
    Ok(())
} 