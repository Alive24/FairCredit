use crate::state::*;
use crate::types::{ResourceError, ResourceKind, ResourceStatus, SubmissionStatus};
use anchor_lang::prelude::*;

/// Allowed time drift for creation_timestamp (±5 minutes in seconds)
const TIMESTAMP_TOLERANCE: i64 = 300;

#[derive(Accounts)]
#[instruction(creation_timestamp: i64)]
pub struct AddResource<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Resource::INIT_SPACE,
        seeds = [
            Resource::SEED_PREFIX.as_bytes(),
            course.key().as_ref(),
            &creation_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(
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
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateResourceData<'info> {
    #[account(
        mut,
        seeds = [
            Resource::SEED_PREFIX.as_bytes(),
            resource.course.as_ref(),
            &resource.created.to_le_bytes(),
        ],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetResourceNostrRef<'info> {
    #[account(
        mut,
        seeds = [
            Resource::SEED_PREFIX.as_bytes(),
            resource.course.as_ref(),
            &resource.created.to_le_bytes(),
        ],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetResourceWalrusRef<'info> {
    #[account(
        mut,
        seeds = [
            Resource::SEED_PREFIX.as_bytes(),
            resource.course.as_ref(),
            &resource.created.to_le_bytes(),
        ],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn add_resource(
    ctx: Context<AddResource>,
    creation_timestamp: i64,
    kind: ResourceKind,
    name: String,
    external_id: Option<String>,
    workload: Option<u32>,
    tags: Vec<String>,
    nostr_d_tag: Option<String>,
    nostr_author_pubkey: Option<[u8; 32]>,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    require!(
        creation_timestamp >= current_time.saturating_sub(TIMESTAMP_TOLERANCE)
            && creation_timestamp <= current_time.saturating_add(TIMESTAMP_TOLERANCE),
        ResourceError::InvalidCreationTimestamp
    );

    require!(tags.len() <= 10, ResourceError::TooManyTags);

    let resource = &mut ctx.accounts.resource;
    resource.created = creation_timestamp;
    resource.updated = current_time;
    resource.name = name;
    resource.kind = kind;
    resource.status = ResourceStatus::Draft;
    resource.external_id = external_id;
    resource.workload = workload;
    resource.course = ctx.accounts.course.key();
    resource.assets = Vec::new();
    resource.tags = tags;
    resource.nostr_d_tag = nostr_d_tag;
    resource.nostr_author_pubkey = nostr_author_pubkey.unwrap_or([0u8; 32]);
    resource.walrus_blob_id = None;
    resource.owner = ctx.accounts.provider_authority.key();

    Ok(())
}

pub fn update_resource_data(
    ctx: Context<UpdateResourceData>,
    name: Option<String>,
    workload: Option<u32>,
    tags: Option<Vec<String>>,
) -> Result<()> {
    let resource = &mut ctx.accounts.resource;

    if let Some(new_name) = name {
        resource.name = new_name;
    }
    if let Some(new_workload) = workload {
        resource.workload = Some(new_workload);
    }
    if let Some(new_tags) = tags {
        require!(new_tags.len() <= 10, ResourceError::TooManyTags);
        resource.tags = new_tags;
    }

    resource.updated = Clock::get()?.unix_timestamp;
    Ok(())
}

pub fn set_resource_nostr_ref(
    ctx: Context<SetResourceNostrRef>,
    nostr_d_tag: String,
    nostr_author_pubkey: [u8; 32],
    force: bool,
) -> Result<()> {
    let resource = &mut ctx.accounts.resource;

    require!(
        ctx.accounts.authority.key() == resource.owner,
        ResourceError::UnauthorizedResourceAuthority
    );

    if !force {
        require!(
            !resource.is_nostr_ref_set(),
            ResourceError::NostrRefAlreadySet
        );
    }

    resource.nostr_d_tag = Some(nostr_d_tag);
    resource.nostr_author_pubkey = nostr_author_pubkey;
    resource.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn set_resource_walrus_ref(
    ctx: Context<SetResourceWalrusRef>,
    walrus_blob_id: String,
) -> Result<()> {
    let resource = &mut ctx.accounts.resource;

    require!(
        ctx.accounts.authority.key() == resource.owner,
        ResourceError::UnauthorizedResourceAuthority
    );

    resource.walrus_blob_id = Some(walrus_blob_id);
    resource.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

#[derive(Accounts)]
#[instruction(creation_timestamp: i64)]
pub struct CreateAsset<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Asset::INIT_SPACE,
        seeds = [
            Asset::SEED_PREFIX.as_bytes(),
            owner.key().as_ref(),
            &creation_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetAssetNostrRef<'info> {
    #[account(
        mut,
        seeds = [
            Asset::SEED_PREFIX.as_bytes(),
            asset.owner.as_ref(),
            &asset.created.to_le_bytes(),
        ],
        bump
    )]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetAssetWalrusRef<'info> {
    #[account(
        mut,
        seeds = [
            Asset::SEED_PREFIX.as_bytes(),
            asset.owner.as_ref(),
            &asset.created.to_le_bytes(),
        ],
        bump
    )]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn create_asset(
    ctx: Context<CreateAsset>,
    creation_timestamp: i64,
    content_type: Option<String>,
    file_name: Option<String>,
    file_size: Option<u64>,
    resource: Option<Pubkey>,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    require!(
        creation_timestamp >= current_time.saturating_sub(TIMESTAMP_TOLERANCE)
            && creation_timestamp <= current_time.saturating_add(TIMESTAMP_TOLERANCE),
        ResourceError::InvalidCreationTimestamp
    );

    let asset = &mut ctx.accounts.asset;
    asset.created = creation_timestamp;
    asset.updated = current_time;
    asset.content_type = content_type;
    asset.file_name = file_name;
    asset.file_size = file_size;
    asset.resource = resource.unwrap_or_default();
    asset.nostr_d_tag = None;
    asset.nostr_author_pubkey = [0u8; 32];
    asset.walrus_blob_id = None;
    asset.owner = ctx.accounts.owner.key();

    Ok(())
}

pub fn set_asset_nostr_ref(
    ctx: Context<SetAssetNostrRef>,
    nostr_d_tag: String,
    nostr_author_pubkey: [u8; 32],
    force: bool,
) -> Result<()> {
    let asset = &mut ctx.accounts.asset;

    require!(
        ctx.accounts.authority.key() == asset.owner,
        ResourceError::UnauthorizedResourceAuthority
    );

    if !force {
        require!(!asset.is_nostr_ref_set(), ResourceError::NostrRefAlreadySet);
    }

    asset.nostr_d_tag = Some(nostr_d_tag);
    asset.nostr_author_pubkey = nostr_author_pubkey;
    asset.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn set_asset_walrus_ref(ctx: Context<SetAssetWalrusRef>, walrus_blob_id: String) -> Result<()> {
    let asset = &mut ctx.accounts.asset;

    require!(
        ctx.accounts.authority.key() == asset.owner,
        ResourceError::UnauthorizedResourceAuthority
    );

    asset.walrus_blob_id = Some(walrus_blob_id);
    asset.updated = Clock::get()?.unix_timestamp;

    Ok(())
}


#[derive(Accounts)]
#[instruction(submission_timestamp: i64)]
pub struct CreateSubmission<'info> {
    #[account(
        init,
        payer = student,
        space = 8 + Submission::INIT_SPACE,
        seeds = [
            Submission::SEED_PREFIX.as_bytes(),
            resource.key().as_ref(),
            student.key().as_ref(),
            &submission_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub submission: Account<'info, Submission>,
    #[account(
        seeds = [
            Resource::SEED_PREFIX.as_bytes(),
            resource.course.as_ref(),
            &resource.created.to_le_bytes(),
        ],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub student: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GradeSubmission<'info> {
    #[account(
        mut,
        seeds = [
            Submission::SEED_PREFIX.as_bytes(),
            submission.resource.as_ref(),
            submission.student.as_ref(),
            &submission.submitted_at.to_le_bytes(),
        ],
        bump
    )]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub grader: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetSubmissionNostrRef<'info> {
    #[account(
        mut,
        seeds = [
            Submission::SEED_PREFIX.as_bytes(),
            submission.resource.as_ref(),
            submission.student.as_ref(),
            &submission.submitted_at.to_le_bytes(),
        ],
        bump
    )]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetSubmissionWalrusRef<'info> {
    #[account(
        mut,
        seeds = [
            Submission::SEED_PREFIX.as_bytes(),
            submission.resource.as_ref(),
            submission.student.as_ref(),
            &submission.submitted_at.to_le_bytes(),
        ],
        bump
    )]
    pub submission: Account<'info, Submission>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn create_submission(
    ctx: Context<CreateSubmission>,
    submission_timestamp: i64,
    assets: Vec<Pubkey>,
    evidence_assets: Vec<Pubkey>,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    require!(
        submission_timestamp >= current_time.saturating_sub(TIMESTAMP_TOLERANCE)
            && submission_timestamp <= current_time.saturating_add(TIMESTAMP_TOLERANCE),
        ResourceError::InvalidCreationTimestamp
    );

    require!(assets.len() <= 10, ResourceError::TooManyAssets);
    require!(evidence_assets.len() <= 10, ResourceError::TooManyAssets);

    let submission = &mut ctx.accounts.submission;
    submission.submitted_at = submission_timestamp;
    submission.updated = current_time;
    submission.resource = ctx.accounts.resource.key();
    submission.student = ctx.accounts.student.key();
    submission.assets = assets;
    submission.evidence_assets = evidence_assets;
    submission.status = SubmissionStatus::Submitted;
    submission.grade = None;
    submission.feedback = None;
    submission.graded_by = None;
    submission.graded_at = None;
    submission.nostr_d_tag = None;
    submission.nostr_author_pubkey = [0u8; 32];
    submission.walrus_blob_id = None;

    Ok(())
}

pub fn grade_submission(
    ctx: Context<GradeSubmission>,
    grade: f64,
    feedback: Option<String>,
) -> Result<()> {
    let submission = &mut ctx.accounts.submission;
    submission.grade_submission(grade, feedback, ctx.accounts.grader.key())?;
    Ok(())
}

pub fn set_submission_nostr_ref(
    ctx: Context<SetSubmissionNostrRef>,
    nostr_d_tag: String,
    nostr_author_pubkey: [u8; 32],
    force: bool,
) -> Result<()> {
    let submission = &mut ctx.accounts.submission;

    require!(
        ctx.accounts.authority.key() == submission.student,
        ResourceError::UnauthorizedResourceAuthority
    );

    if !force {
        require!(
            !submission.is_nostr_ref_set(),
            ResourceError::NostrRefAlreadySet
        );
    }

    submission.nostr_d_tag = Some(nostr_d_tag);
    submission.nostr_author_pubkey = nostr_author_pubkey;
    submission.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn set_submission_walrus_ref(
    ctx: Context<SetSubmissionWalrusRef>,
    walrus_blob_id: String,
) -> Result<()> {
    let submission = &mut ctx.accounts.submission;

    require!(
        ctx.accounts.authority.key() == submission.student,
        ResourceError::UnauthorizedResourceAuthority
    );

    submission.walrus_blob_id = Some(walrus_blob_id);
    submission.updated = Clock::get()?.unix_timestamp;

    Ok(())
}
