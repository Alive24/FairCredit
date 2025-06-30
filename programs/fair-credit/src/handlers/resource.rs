use anchor_lang::prelude::*;
use crate::state::*;
use crate::types::{ResourceKind, ResourceStatus, SubmissionStatus, ResourceError};

#[derive(Accounts)]
#[instruction(resource_id: String)]
pub struct AddResource<'info> {
    #[account(
        init,
        payer = teacher,
        space = Resource::space(),
        seeds = [Resource::SEED_PREFIX.as_bytes(), resource_id.as_bytes()],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(
        mut,
        seeds = [Course::SEED_PREFIX.as_bytes(), course.id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [College::SEED_PREFIX.as_bytes(), course.college_id.as_bytes()],
        bump
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub teacher: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(asset_id: String)]
pub struct CreateAsset<'info> {
    #[account(
        init,
        payer = uploader,
        space = Asset::space(),
        seeds = [Asset::SEED_PREFIX.as_bytes(), asset_id.as_bytes()],
        bump
    )]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub uploader: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(submission_id: String)]
pub struct CreateSubmission<'info> {
    #[account(
        init,
        payer = student_authority,
        space = ResourceSubmission::space(),
        seeds = [ResourceSubmission::SEED_PREFIX.as_bytes(), submission_id.as_bytes()],
        bump
    )]
    pub submission: Account<'info, ResourceSubmission>,
    #[account(
        seeds = [Resource::SEED_PREFIX.as_bytes(), resource.id.as_bytes()],
        bump
    )]
    pub resource: Account<'info, Resource>,
    #[account(
        seeds = [Student::SEED_PREFIX.as_bytes(), student.id.as_bytes()],
        bump,
        constraint = student.wallet == student_authority.key()
    )]
    pub student: Account<'info, Student>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn add_resource(
    ctx: Context<AddResource>,
    resource_id: String,
    name: String,
    kind: ResourceKind,
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
    resource.created_by = ctx.accounts.teacher.key();

    // Add resource to course
    course.add_resource(resource_id)?;

    Ok(())
}

pub fn modify_resource(
    ctx: Context<ModifyResource>,
    name: Option<String>,
    kind: Option<ResourceKind>,
    is_grade_required: Option<bool>,
    external_id: Option<String>,
    content: Option<String>,
    workload: Option<u32>,
    weight_ids: Option<Vec<String>>,
    tags: Option<Vec<String>>,
    teacher_ids: Option<Vec<String>>,
) -> Result<()> {
    let resource = &mut ctx.accounts.resource;
    
    if let Some(name) = name {
        resource.name = name;
    }
    if let Some(kind) = kind {
        resource.kind = kind;
    }
    if let Some(is_grade_required) = is_grade_required {
        resource.is_grade_required = is_grade_required;
    }
    if let Some(external_id) = external_id {
        resource.external_id = Some(external_id);
    }
    if let Some(content) = content {
        resource.update_content(content)?;
    }
    if let Some(workload) = workload {
        resource.workload = Some(workload);
    }
    if let Some(weight_ids) = weight_ids {
        require!(weight_ids.len() <= 10, ResourceError::TooManyAssets);
        resource.weight_ids = weight_ids;
    }
    if let Some(tags) = tags {
        require!(tags.len() <= 10, ResourceError::TooManyTags);
        resource.tags = tags;
    }
    if let Some(teacher_ids) = teacher_ids {
        require!(teacher_ids.len() <= 5, ResourceError::TooManyTeachers);
        resource.teacher_ids = teacher_ids;
    }

    resource.updated = Clock::get()?.unix_timestamp;
    Ok(())
}

pub fn create_asset(
    ctx: Context<CreateAsset>,
    asset_id: String,
    content_type: Option<String>,
    file_name: Option<String>,
    import_url: Option<String>,
    file_size: Option<u64>,
    resource_id: Option<String>,
) -> Result<()> {
    let asset = &mut ctx.accounts.asset;
    let clock = Clock::get()?;
    
    asset.id = asset_id;
    asset.content_type = content_type;
    asset.file_name = file_name;
    asset.import_url = import_url;
    asset.ipfs_hash = None;
    asset.file_size = file_size;
    asset.created = clock.unix_timestamp;
    asset.uploaded_by = ctx.accounts.uploader.key();
    asset.resource_id = resource_id;

    Ok(())
}

pub fn add_submission(
    ctx: Context<CreateSubmission>,
    submission_id: String,
    content: Option<String>,
    asset_ids: Vec<String>,
    evidence_asset_ids: Vec<String>,
) -> Result<()> {
    require!(asset_ids.len() <= 10, ResourceError::TooManyAssets);
    require!(evidence_asset_ids.len() <= 10, ResourceError::TooManyAssets);
    
    let submission = &mut ctx.accounts.submission;
    let resource = &ctx.accounts.resource;
    let student = &ctx.accounts.student;
    let clock = Clock::get()?;
    
    submission.id = submission_id;
    submission.resource_id = resource.id.clone();
    submission.student_id = student.id.clone();
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
    submission.grade_submission(grade, feedback, ctx.accounts.teacher.key())?;
    Ok(())
}

pub fn update_asset_ipfs_hash(
    ctx: Context<UpdateAssetIPFS>,
    ipfs_hash: String,
) -> Result<()> {
    let asset = &mut ctx.accounts.asset;
    asset.set_ipfs_hash(ipfs_hash)?;
    Ok(())
}

#[derive(Accounts)]
pub struct ModifyResource<'info> {
    #[account(
        mut,
        seeds = [Resource::SEED_PREFIX.as_bytes(), resource.id.as_bytes()],
        bump,
        constraint = resource.created_by == teacher.key()
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub teacher: Signer<'info>,
}

#[derive(Accounts)]
pub struct GradeSubmission<'info> {
    #[account(
        mut,
        seeds = [ResourceSubmission::SEED_PREFIX.as_bytes(), submission.id.as_bytes()],
        bump
    )]
    pub submission: Account<'info, ResourceSubmission>,
    #[account(
        seeds = [Resource::SEED_PREFIX.as_bytes(), submission.resource_id.as_bytes()],
        bump,
        constraint = resource.teacher_ids.contains(&teacher.key().to_string())
    )]
    pub resource: Account<'info, Resource>,
    #[account(mut)]
    pub teacher: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAssetIPFS<'info> {
    #[account(
        mut,
        seeds = [Asset::SEED_PREFIX.as_bytes(), asset.id.as_bytes()],
        bump,
        constraint = asset.uploaded_by == uploader.key()
    )]
    pub asset: Account<'info, Asset>,
    #[account(mut)]
    pub uploader: Signer<'info>,
} 