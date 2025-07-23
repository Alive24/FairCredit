// Suppress deprecation warning from Anchor's internal code generation
// This warning comes from Anchor 0.31.1's #[program] macro using the deprecated
// AccountInfo::realloc instead of AccountInfo::resize. This will be fixed in a
// future Anchor release.
#![allow(deprecated)]

use anchor_lang::prelude::*;

pub mod types;
pub mod state;
pub mod handlers;
pub mod events;

// Use specific imports instead of wildcards
use handlers::provider::*;
use handlers::verifier_update::*;

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

    pub fn expand_verifier_capacity(
        ctx: Context<ExpandVerifierCapacity>,
    ) -> Result<()> {
        handlers::verifier_update::expand_verifier_capacity(ctx)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
