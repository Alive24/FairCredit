use anchor_lang::prelude::*;

pub mod types;
pub mod state;
pub mod handlers;

// Use specific imports instead of wildcards
use handlers::provider::*;
use state::{provider::*, verifier::*};

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
        website: String,
        email: String,
        provider_type: String,
    ) -> Result<()> {
        handlers::provider::initialize_provider(ctx, name, description, website, email, provider_type)
    }

    pub fn initialize_verifier(
        ctx: Context<InitializeVerifier>,
    ) -> Result<()> {
        handlers::provider::initialize_verifier(ctx)
    }

    pub fn suspend_provider(
        ctx: Context<SuspendProvider>,
    ) -> Result<()> {
        handlers::provider::suspend_provider(ctx)
    }

    pub fn unsuspend_provider(
        ctx: Context<UnsuspendProvider>,
    ) -> Result<()> {
        handlers::provider::unsuspend_provider(ctx)
    }

    pub fn set_provider_reputation(
        ctx: Context<SetProviderReputation>,
        reputation_score: u64,
        note: Option<String>,
    ) -> Result<()> {
        handlers::provider::set_provider_reputation(ctx, reputation_score, note)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
