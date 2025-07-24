use anchor_lang::prelude::*;
use crate::state::{Hub, HubConfig, Provider, Course};
use crate::types::HubError;
use crate::events::*;

#[derive(Accounts)]
pub struct InitializeHub<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Hub::INIT_SPACE,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump
    )]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateHubConfig<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddAcceptedProvider<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub authority: Signer<'info>,
    /// The provider account to be added
    #[account(
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider_wallet.key().as_ref()],
        bump
    )]
    pub provider: Account<'info, Provider>,
    /// CHECK: Provider wallet being added
    pub provider_wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RemoveAcceptedProvider<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub authority: Signer<'info>,
    /// CHECK: Provider wallet being removed
    pub provider_wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct AddAcceptedEndorser<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub authority: Signer<'info>,
    /// CHECK: Endorser wallet being added
    pub endorser_wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct RemoveAcceptedEndorser<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub authority: Signer<'info>,
    /// CHECK: Endorser wallet being removed
    pub endorser_wallet: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct TransferHubAuthority<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == current_authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub current_authority: Signer<'info>,
    /// CHECK: New authority to transfer to
    pub new_authority: AccountInfo<'info>,
}

#[derive(Accounts)]
#[instruction(course_id: String)]
pub struct AddAcceptedCourse<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub authority: Signer<'info>,
    /// The course account to be added
    #[account(
        seeds = [Course::SEED_PREFIX.as_bytes(), course_id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
}

#[derive(Accounts)]
#[instruction(course_id: String)]
pub struct RemoveAcceptedCourse<'info> {
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump,
        constraint = hub.authority == authority.key() @ HubError::UnauthorizedHubAction
    )]
    pub hub: Account<'info, Hub>,
    pub authority: Signer<'info>,
}

pub fn initialize_hub(ctx: Context<InitializeHub>) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    let clock = Clock::get()?;
    
    hub.authority = ctx.accounts.authority.key();
    hub.accepted_providers = Vec::new();
    hub.accepted_endorsers = Vec::new();
    hub.accepted_courses = Vec::new();
    hub.created_at = clock.unix_timestamp;
    hub.updated_at = clock.unix_timestamp;
    hub.config = HubConfig::default();
    
    // Emit hub initialized event
    emit!(HubInitialized {
        authority: hub.authority,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}

pub fn update_hub_config(
    ctx: Context<UpdateHubConfig>,
    config: HubConfig,
) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    hub.update_config(config)?;
    
    // Emit hub config updated event
    emit!(HubConfigUpdated {
        authority: ctx.accounts.authority.key(),
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn add_accepted_provider(ctx: Context<AddAcceptedProvider>) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    let provider_wallet = ctx.accounts.provider_wallet.key();
    
    hub.add_provider(provider_wallet)?;
    
    // Emit provider accepted event
    emit!(ProviderAccepted {
        hub_authority: hub.authority,
        provider: provider_wallet,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn remove_accepted_provider(ctx: Context<RemoveAcceptedProvider>) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    let provider_wallet = ctx.accounts.provider_wallet.key();
    
    hub.remove_provider(&provider_wallet)?;
    
    // Emit provider removed event
    emit!(ProviderRemovedFromHub {
        hub_authority: hub.authority,
        provider: provider_wallet,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn add_accepted_endorser(ctx: Context<AddAcceptedEndorser>) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    let endorser_wallet = ctx.accounts.endorser_wallet.key();
    
    hub.add_endorser(endorser_wallet)?;
    
    // Emit endorser accepted event
    emit!(EndorserAccepted {
        hub_authority: hub.authority,
        endorser: endorser_wallet,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn remove_accepted_endorser(ctx: Context<RemoveAcceptedEndorser>) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    let endorser_wallet = ctx.accounts.endorser_wallet.key();
    
    hub.remove_endorser(&endorser_wallet)?;
    
    // Emit endorser removed event
    emit!(EndorserRemovedFromHub {
        hub_authority: hub.authority,
        endorser: endorser_wallet,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn transfer_hub_authority(ctx: Context<TransferHubAuthority>) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    let new_authority = ctx.accounts.new_authority.key();
    let old_authority = hub.authority;
    
    hub.authority = new_authority;
    hub.updated_at = Clock::get()?.unix_timestamp;
    
    // Emit authority transferred event
    emit!(HubAuthorityTransferred {
        old_authority,
        new_authority,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn add_accepted_course(
    ctx: Context<AddAcceptedCourse>,
    course_id: String,
) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    let course = &ctx.accounts.course;
    
    // Verify the course belongs to an accepted provider
    require!(
        hub.is_provider_accepted(&course.provider),
        HubError::ProviderNotAccepted
    );
    
    hub.add_course(course_id.clone())?;
    
    // Emit course accepted event
    emit!(CourseAccepted {
        hub_authority: hub.authority,
        course_id,
        provider: course.provider,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn remove_accepted_course(
    ctx: Context<RemoveAcceptedCourse>,
    course_id: String,
) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    
    hub.remove_course(&course_id)?;
    
    // Emit course removed event
    emit!(CourseRemovedFromHub {
        hub_authority: hub.authority,
        course_id,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}