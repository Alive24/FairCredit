use anchor_lang::prelude::*;
use crate::state::Verifier;

/// Example of using realloc constraint for dynamic account resizing
/// This allows verifiers to expand their provider assessment capacity
#[derive(Accounts)]
pub struct ExpandVerifierCapacity<'info> {
    #[account(
        mut,
        seeds = [Verifier::SEED_PREFIX.as_bytes(), verifier_authority.key().as_ref()],
        bump,
        // Reallocate to add space for 10 more provider assessments
        // Each ProviderAssessment is approximately 100 bytes
        realloc = verifier_account.to_account_info().data_len() + 1000,
        realloc::payer = verifier_authority,
        realloc::zero = false,
    )]
    pub verifier_account: Account<'info, Verifier>,
    #[account(mut)]
    pub verifier_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn expand_verifier_capacity(
    ctx: Context<ExpandVerifierCapacity>,
) -> Result<()> {
    // The account has already been resized by the realloc constraint
    // We just need to ensure the verifier knows about the expansion
    msg!("Verifier capacity expanded successfully");
    msg!("New account size: {}", ctx.accounts.verifier_account.to_account_info().data_len());
    
    Ok(())
}