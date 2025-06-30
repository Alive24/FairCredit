use anchor_lang::prelude::*;

pub mod types;
pub mod state;
pub mod handlers;

// Use specific imports instead of wildcards
use handlers::provider::*;
use state::provider::*;
use types::provider::*;

declare_id!("BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk");

#[program]
pub mod fair_credit {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn initialize_provider(
        ctx: Context<InitializeProvider>,
        name: String,
        description: String,
    ) -> Result<()> {
        handlers::provider::initialize_provider(ctx, name, description)
    }

    pub fn update_provider_status(
        ctx: Context<UpdateProviderStatus>,
        new_status: ProviderStatus,
    ) -> Result<()> {
        handlers::provider::update_provider_status(ctx, new_status)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
