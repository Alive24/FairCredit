use anchor_lang::prelude::*;

pub mod types;
pub mod state;
pub mod handlers;

pub use types::*;
pub use state::*;

declare_id!("Bmivd95djS8qSohutibkJXy63UJoBDhyu8DsmZVcRLev");

#[program]
pub mod fair_credit {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
