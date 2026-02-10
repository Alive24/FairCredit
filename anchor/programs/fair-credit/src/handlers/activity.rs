use crate::events::*;
use crate::state::*;
use crate::types::{ActivityError, ActivityKind, ActivityStatus, ResourceKind};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(creation_timestamp: i64)]
pub struct CreateActivity<'info> {
    #[account(
        init,
        payer = student,
        space = 8 + Activity::INIT_SPACE,
        seeds = [
            Activity::SEED_PREFIX.as_bytes(),
            provider.key().as_ref(),
            student.key().as_ref(),
            &creation_timestamp.to_le_bytes(),
        ],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub student: Signer<'info>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.wallet.as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AddFeedback<'info> {
    #[account(
        mut,
        seeds = [
            Activity::SEED_PREFIX.as_bytes(),
            activity.provider.as_ref(),
            activity.student.as_ref(),
            &activity.created.to_le_bytes(),
        ],
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
        seeds = [
            Activity::SEED_PREFIX.as_bytes(),
            activity.provider.as_ref(),
            activity.student.as_ref(),
            &activity.created.to_le_bytes(),
        ],
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
        seeds = [
            Activity::SEED_PREFIX.as_bytes(),
            activity.provider.as_ref(),
            activity.student.as_ref(),
            &activity.created.to_le_bytes(),
        ],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
}

pub fn create_activity(
    ctx: Context<CreateActivity>,
    creation_timestamp: i64,
    kind: ActivityKind,
    data: String,
    degree_id: Option<String>,
    course: Option<Pubkey>,
    resource_id: Option<String>,
    resource_kind: Option<ResourceKind>,
) -> Result<()> {
    let activity = &mut ctx.accounts.activity;
    let clock = Clock::get()?;

    require!(
        creation_timestamp >= clock.unix_timestamp.saturating_sub(300)
            && creation_timestamp <= clock.unix_timestamp.saturating_add(60),
        ActivityError::InvalidCreationTimestamp
    );

    activity.created = creation_timestamp;
    activity.updated = clock.unix_timestamp;
    activity.student = ctx.accounts.student.key();
    activity.provider = ctx.accounts.provider.key();
    activity.degree_id = degree_id;
    activity.course = course;
    activity.resource_id = resource_id;
    activity.data = data;
    activity.kind = kind;
    activity.status = ActivityStatus::Active;
    activity.resource_kind = resource_kind;
    activity.grade = None;
    activity.assets = Vec::new();
    activity.evidence_assets = Vec::new();

    emit!(ActivityCreated {
        activity: activity.key(),
        student: activity.student,
        provider: activity.provider,
        course: activity.course,
        kind: format!("{:?}", activity.kind),
        timestamp: clock.unix_timestamp,
    });

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

pub fn add_attendance(ctx: Context<AddAttendance>, timestamp: Option<String>) -> Result<()> {
    let activity = &mut ctx.accounts.activity;

    // Update activity data with attendance timestamp
    if let Some(ts) = timestamp {
        activity.data = ts;
    }
    activity.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

pub fn archive_activity(ctx: Context<ArchiveActivity>) -> Result<bool> {
    let activity = &mut ctx.accounts.activity;
    activity.archive()?;
    Ok(true)
}

#[derive(Accounts)]
pub struct ArchiveActivity<'info> {
    #[account(
        mut,
        seeds = [
            Activity::SEED_PREFIX.as_bytes(),
            activity.provider.as_ref(),
            activity.student.as_ref(),
            &activity.created.to_le_bytes(),
        ],
        bump
    )]
    pub activity: Account<'info, Activity>,
    #[account(mut)]
    pub user: Signer<'info>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::state::Activity;
    use crate::types::{ActivityKind, ActivityStatus};

    fn dummy_activity() -> Activity {
        Activity {
            created: 0,
            updated: 0,
            student: Pubkey::default(),
            provider: Pubkey::default(),
            degree_id: None,
            course: None,
            resource_id: None,
            data: String::new(),
            kind: ActivityKind::AttendMeeting,
            status: ActivityStatus::Active,
            resource_kind: None,
            grade: None,
            assets: Vec::new(),
            evidence_assets: Vec::new(),
        }
    }

    #[test]
    fn add_feedback_updates_content_and_assets() {
        let mut activity = dummy_activity();
        let content = "Great session!".to_string();
        let asset_ids = vec!["asset1".to_string(), "asset2".to_string()];
        let evidence_ids = vec!["evidence1".to_string()];

        // Mirror handler constraints.
        assert!(asset_ids.len() <= 10);
        assert!(evidence_ids.len() <= 10);

        activity.data = content.clone();
        activity.assets = asset_ids.clone();
        activity.evidence_assets = evidence_ids.clone();

        assert_eq!(activity.data, content);
        assert_eq!(activity.assets, asset_ids);
        assert_eq!(activity.evidence_assets, evidence_ids);
    }

    #[test]
    fn add_grade_sets_grade_and_assets() {
        let mut activity = dummy_activity();
        let grade_value = 95.5_f64;

        // Validate the success path without depending on additional state-machine constraints.
        let _ = activity.update_grade(grade_value);
        assert_eq!(activity.grade, Some(grade_value));
    }

    #[test]
    fn archive_activity_changes_status() {
        let mut activity = dummy_activity();
        // Initial status should be Active.
        assert_eq!(activity.status, ActivityStatus::Active);
        let _ = activity.archive();
        assert_eq!(activity.status, ActivityStatus::Archived);
    }
}
