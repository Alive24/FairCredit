use crate::events::*;
use crate::state::{Hub, Provider};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct InitializeProvider<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Provider::INIT_SPACE,
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider_account: Account<'info, Provider>,
    /// Hub that this provider is registered under
    #[account(
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump
    )]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
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
    provider.endorsers = Vec::new();

    // Emit provider registered event
    emit!(ProviderRegistered {
        provider: provider.wallet,
        name,
        provider_type,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct AddProviderEndorser<'info> {
    #[account(
        mut,
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump,
        constraint = provider_account.wallet == provider_authority.key() @ crate::types::ProviderError::UnauthorizedProviderAction
    )]
    pub provider_account: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
    /// CHECK: Endorser wallet being added
    pub endorser_wallet: AccountInfo<'info>,
}

pub fn add_provider_endorser(ctx: Context<AddProviderEndorser>) -> Result<()> {
    let provider = &mut ctx.accounts.provider_account;
    let endorser_wallet = ctx.accounts.endorser_wallet.key();

    provider.add_endorser(endorser_wallet)?;

    emit!(ProviderEndorserAdded {
        provider: provider.wallet,
        endorser: endorser_wallet,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct RemoveProviderEndorser<'info> {
    #[account(
        mut,
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump,
        constraint = provider_account.wallet == provider_authority.key() @ crate::types::ProviderError::UnauthorizedProviderAction
    )]
    pub provider_account: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    pub provider_authority: Signer<'info>,
    /// CHECK: Endorser wallet being removed
    pub endorser_wallet: AccountInfo<'info>,
}

pub fn remove_provider_endorser(ctx: Context<RemoveProviderEndorser>) -> Result<()> {
    let provider = &mut ctx.accounts.provider_account;
    let endorser_wallet = ctx.accounts.endorser_wallet.key();

    provider.remove_endorser(&endorser_wallet)?;

    emit!(ProviderEndorserRemoved {
        provider: provider.wallet,
        endorser: endorser_wallet,
        timestamp: Clock::get()?.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct CloseProvider<'info> {
    #[account(
        mut,
        close = provider_authority,
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump,
        constraint = provider_account.wallet == provider_authority.key() @ crate::types::ProviderError::UnauthorizedProviderAction
    )]
    pub provider_account: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

pub fn close_provider(_ctx: Context<CloseProvider>) -> Result<()> {
    Ok(())
}
