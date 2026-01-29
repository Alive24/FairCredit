use crate::state::*;
use crate::types::{ResourceError, ResourceKind, ResourceStatus, SubmissionStatus};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(resource_id: String)]
pub struct AddResource<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Resource::INIT_SPACE,
        seeds = [Resource::SEED_PREFIX.as_bytes(), resource_id.as_bytes()],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(
        mut,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            provider.key().as_ref(),
            course.id.as_bytes(),
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
        seeds = [Resource::SEED_PREFIX.as_bytes(), resource.id.as_bytes()],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(submission_id: String)]
pub struct CreateSubmission<'info> {
    #[account(
        init,
        payer = student_authority,
        space = 8 + ResourceSubmission::INIT_SPACE,
        seeds = [ResourceSubmission::SEED_PREFIX.as_bytes(), submission_id.as_bytes()],
        bump
    )]
    pub submission: Account<'info, ResourceSubmission>,
    #[account(
        seeds = [Resource::SEED_PREFIX.as_bytes(), resource.id.as_bytes()],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn add_resource(
    ctx: Context<AddResource>,
    resource_id: String,
    kind: ResourceKind,
    name: String,
    is_grade_required: bool,
    external_id: Option<String>,
    content: Option<String>,
    workload: Option<u32>,
    weight_ids: Vec<String>,
    tags: Vec<String>,
    teacher_ids: Vec<String>,
) -> Result<()> {
    require!(weight_ids.len() <= 10, ResourceError::TooManyAssets);
    require!(tags.len() <= 10, ResourceError::TooManyTags);
    require!(teacher_ids.len() <= 5, ResourceError::TooManyTeachers);

    let resource = &mut ctx.accounts.resource;
    let course = &mut ctx.accounts.course;
    let clock = Clock::get()?;

    resource.id = resource_id.clone();
    resource.name = name;
    resource.kind = kind;
    resource.status = ResourceStatus::Draft;
    resource.is_grade_required = is_grade_required;
    resource.external_id = external_id;
    resource.content = content;
    resource.workload = workload;
    resource.course_id = course.id.clone();
    resource.weight_ids = weight_ids;
    resource.asset_ids = Vec::new();
    resource.tags = tags;
    resource.teacher_ids = teacher_ids;
    resource.created = clock.unix_timestamp;
    resource.updated = clock.unix_timestamp;
    resource.created_by = ctx.accounts.provider_authority.key();

    // Add resource to course
    course.add_resource(resource_id)?;

    Ok(())
}

pub fn update_resource_data(
    ctx: Context<UpdateResourceData>,
    name: Option<String>,
    content: Option<String>,
    workload: Option<u32>,
    tags: Option<Vec<String>>,
) -> Result<()> {
    let resource = &mut ctx.accounts.resource;

    if let Some(new_name) = name {
        resource.name = new_name;
    }
    if let Some(new_content) = content {
        resource.update_content(new_content)?;
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

pub fn create_submission(
    ctx: Context<CreateSubmission>,
    submission_id: String,
    student_id: String,
    content: Option<String>,
    asset_ids: Vec<String>,
    evidence_asset_ids: Vec<String>,
) -> Result<()> {
    require!(asset_ids.len() <= 10, ResourceError::TooManyAssets);
    require!(evidence_asset_ids.len() <= 10, ResourceError::TooManyAssets);

    let submission = &mut ctx.accounts.submission;
    let clock = Clock::get()?;

    submission.id = submission_id;
    submission.resource_id = ctx.accounts.resource.id.clone();
    submission.student_id = student_id;
    submission.content = content;
    submission.asset_ids = asset_ids;
    submission.evidence_asset_ids = evidence_asset_ids;
    submission.submitted_at = clock.unix_timestamp;
    submission.status = SubmissionStatus::Submitted;
    submission.grade = None;
    submission.feedback = None;
    submission.graded_by = None;
    submission.graded_at = None;

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

#[derive(Accounts)]
pub struct GradeSubmission<'info> {
    #[account(
        mut,
        seeds = [ResourceSubmission::SEED_PREFIX.as_bytes(), submission.id.as_bytes()],
        bump
    )]
    pub submission: Account<'info, ResourceSubmission>,
    #[account(mut)]
    pub grader: Signer<'info>,
}
