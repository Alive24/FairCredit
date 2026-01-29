use anchor_lang::prelude::*;
use crate::state::*;
use crate::types::{ActivityKind, ActivityStatus, ResourceKind, ActivityError};

#[derive(Accounts)]
#[instruction(activity_id: String)]
pub struct CreateActivity<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Activity::INIT_SPACE,
        seeds = [Activity::SEED_PREFIX.as_bytes(), activity_id.as_bytes()],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddFeedback<'info> {
    #[account(
        mut,
        seeds = [Activity::SEED_PREFIX.as_bytes(), activity.id.as_bytes()],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddGrade<'info> {
    #[account(
        mut,
        seeds = [Activity::SEED_PREFIX.as_bytes(), activity.id.as_bytes()],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub teacher: Signer<'info>,
}

#[derive(Accounts)]
pub struct AddAttendance<'info> {
    #[account(
        mut,
        seeds = [Activity::SEED_PREFIX.as_bytes(), activity.id.as_bytes()],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
}

pub fn create_activity(
    ctx: Context<CreateActivity>,
    activity_id: String,
    user_id: String,
    provider_id: String,
    kind: ActivityKind,
    data: String,
    degree_id: Option<String>,
    weight_id: Option<String>,
    course_id: Option<String>,
    resource_id: Option<String>,
    resource_kind: Option<ResourceKind>,
) -> Result<()> {
    let activity = &mut ctx.accounts.activity;
    let clock = Clock::get()?;
    
    activity.id = activity_id;
    activity.created = clock.unix_timestamp;
    activity.updated = clock.unix_timestamp;
    activity.user_id = user_id;
    activity.college_id = provider_id;
    activity.degree_id = degree_id;
    activity.weight_id = weight_id;
    activity.course_id = course_id;
    activity.resource_id = resource_id;
    activity.data = data;
    activity.kind = kind;
    activity.status = ActivityStatus::Active;
    activity.resource_kind = resource_kind;
    activity.grade = None;
    activity.assets = Vec::new();
    activity.evidence_assets = Vec::new();

    Ok(())
}

pub fn add_feedback(
    ctx: Context<AddFeedback>,
    content: String,
    asset_ids: Vec<String>,
    evidence_asset_ids: Vec<String>,
) -> Result<()> {
    require!(asset_ids.len() <= 10, ActivityError::TooManyAssets);
    require!(evidence_asset_ids.len() <= 10, ActivityError::TooManyAssets);
    
    let activity = &mut ctx.accounts.activity;
    
    // Update activity data with feedback
    activity.data = content;
    activity.assets = asset_ids;
    activity.evidence_assets = evidence_asset_ids;
    activity.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn add_grade(
    ctx: Context<AddGrade>,
    grade_value: f64,
    asset_ids: Vec<String>,
    evidence_asset_ids: Vec<String>,
) -> Result<()> {
    require!(asset_ids.len() <= 10, ActivityError::TooManyAssets);
    require!(evidence_asset_ids.len() <= 10, ActivityError::TooManyAssets);
    
    let activity = &mut ctx.accounts.activity;
    
    activity.update_grade(grade_value)?;
    activity.assets = asset_ids;
    activity.evidence_assets = evidence_asset_ids;

    Ok(())
}

pub fn add_attendance(
    ctx: Context<AddAttendance>,
    timestamp: Option<String>,
) -> Result<()> {
    let activity = &mut ctx.accounts.activity;
    
    // Update activity data with attendance timestamp
    if let Some(ts) = timestamp {
        activity.data = ts;
    }
    activity.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn archive_activity(
    ctx: Context<ArchiveActivity>,
) -> Result<bool> {
    let activity = &mut ctx.accounts.activity;
    activity.archive()?;
    Ok(true)
}

#[derive(Accounts)]
pub struct ArchiveActivity<'info> {
    #[account(
        mut,
        seeds = [Activity::SEED_PREFIX.as_bytes(), activity.id.as_bytes()],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub user: Signer<'info>,
} 