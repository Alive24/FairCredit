use crate::state::*;
use crate::types::{CourseError, CourseStatus};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(creation_timestamp: i64)]
pub struct CreateCourse<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Course::INIT_SPACE,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &creation_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        mut,
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn create_course(
    ctx: Context<CreateCourse>,
    creation_timestamp: i64,
    name: String,
    description: String,
    workload_required: u32,
    degree_id: Option<String>,
    nostr_d_tag: Option<String>,
    nostr_author_pubkey: Option<[u8; 32]>,
) -> Result<()> {
    let course = &mut ctx.accounts.course;
    let clock = Clock::get()?;
    // Reject if timestamp is too far from current time (e.g. ±5 min) to avoid replay
    let now = clock.unix_timestamp;
    require!(
        creation_timestamp >= now.saturating_sub(300)
            && creation_timestamp <= now.saturating_add(60),
        CourseError::InvalidCreationTimestamp
    );

    course.creation_timestamp = creation_timestamp;
    course.created = clock.unix_timestamp;
    course.updated = clock.unix_timestamp;
    course.provider = ctx.accounts.provider_authority.key();
    course.status = CourseStatus::Draft;
    course.rejection_reason = None;
    course.name = name;
    course.description = description;
    course.modules = Vec::new();
    course.workload_required = workload_required;
    course.workload = 0;
    course.college_id = ctx.accounts.provider.wallet.to_string();
    course.degree_id = degree_id;
    course.nostr_d_tag = nostr_d_tag;
    course.nostr_author_pubkey = nostr_author_pubkey.unwrap_or([0u8; 32]);
    course.approved_credentials = Vec::new();

    Ok(())
}

#[derive(Accounts)]
pub struct AddCourseModule<'info> {
    #[account(
        mut,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &course.creation_timestamp.to_le_bytes(),
        ],
        bump,
        constraint = course.provider == provider_authority.key()
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

pub fn add_course_module(
    ctx: Context<AddCourseModule>,
    resource: Pubkey,
    percentage: u8,
) -> Result<()> {
    ctx.accounts.course.add_module(resource, percentage)?;
    Ok(())
}

pub fn update_course_status(
    ctx: Context<UpdateCourseStatus>,
    status: CourseStatus,
    rejection_reason: Option<String>,
) -> Result<()> {
    let course = &mut ctx.accounts.course;
    course.update_status(status, rejection_reason)?;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateCourseStatus<'info> {
    #[account(
        mut,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &course.creation_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetCourseNostrRef<'info> {
    #[account(
        mut,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &course.creation_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

pub fn set_course_nostr_ref(
    ctx: Context<SetCourseNostrRef>,
    nostr_d_tag: String,
    nostr_author_pubkey: [u8; 32],
    force: bool,
) -> Result<()> {
    let course = &mut ctx.accounts.course;

    require!(
        ctx.accounts.provider_authority.key() == course.provider,
        CourseError::UnauthorizedCourseAuthority
    );

    if !force {
        require!(!course.is_nostr_ref_set(), CourseError::NostrRefAlreadySet);
    }

    course.nostr_d_tag = Some(nostr_d_tag);
    course.nostr_author_pubkey = nostr_author_pubkey;
    course.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
pub struct CloseCourse<'info> {
    #[account(
        mut,
        close = provider_authority,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &course.creation_timestamp.to_le_bytes(),
        ],
        bump,
        constraint = course.provider == provider_authority.key()
    )]
    pub course: Account<'info, Course>,
    #[account(
        mut,
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(
        mut,
        seeds = [Hub::SEED_PREFIX.as_bytes()],
        bump
    )]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

/// Close a course account and reclaim its lamports back to the provider authority.
/// If the course was accepted by the hub, it is also removed from the hub's accepted list.
pub fn close_course(ctx: Context<CloseCourse>) -> Result<()> {
    // Best-effort remove from hub accepted courses; ignore if not present.
    ctx.accounts.hub.remove_course(&ctx.accounts.course.key())?;

    Ok(())
}

#[derive(Accounts)]
pub struct UpdateCourseModule<'info> {
    #[account(
        mut,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &course.creation_timestamp.to_le_bytes(),
        ],
        bump,
        constraint = course.provider == provider_authority.key()
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

pub fn update_course_module(
    ctx: Context<UpdateCourseModule>,
    resource: Pubkey,
    percentage: u8,
) -> Result<()> {
    ctx.accounts.course.update_module(resource, percentage)?;
    Ok(())
}
