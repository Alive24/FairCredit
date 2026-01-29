use crate::events::*;
use crate::state::Provider;
use anchor_lang::prelude::*;

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
