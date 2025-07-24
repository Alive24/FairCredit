use anchor_lang::prelude::*;
use crate::state::*;
use crate::types::{CourseStatus, CourseStudentStatus, CourseError};

#[derive(Accounts)]
#[instruction(course_id: String)]
pub struct CreateCourse<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Course::INIT_SPACE,
        seeds = [Course::SEED_PREFIX.as_bytes(), course_id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        mut,
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider_authority.key().as_ref()],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(weight_id: String)]
pub struct CreateWeight<'info> {
    #[account(
        init,
        payer = provider_authority,
        space = 8 + Weight::INIT_SPACE,
        seeds = [Weight::SEED_PREFIX.as_bytes(), weight_id.as_bytes()],
        bump
    )]
    pub weight: Account<'info, Weight>,
    #[account(
        mut,
        seeds = [Course::SEED_PREFIX.as_bytes(), course.id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider_authority.key().as_ref()],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ArchiveCourseProgress<'info> {
    #[account(
        mut,
        seeds = [CourseStudent::SEED_PREFIX.as_bytes(), course_student.course_id.as_bytes(), course_student.student_id.as_bytes()],
        bump
    )]
    pub course_student: Account<'info, CourseStudent>,
    #[account(
        seeds = [Course::SEED_PREFIX.as_bytes(), course_student.course_id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider_authority.key().as_ref()],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

pub fn create_course(
    ctx: Context<CreateCourse>,
    course_id: String,
    name: String,
    description: String,
    workload_required: u32,
    degree_id: Option<String>,
) -> Result<()> {
    let course = &mut ctx.accounts.course;
    let clock = Clock::get()?;
    
    course.id = course_id.clone();
    course.created = clock.unix_timestamp;
    course.updated = clock.unix_timestamp;
    course.provider = ctx.accounts.provider_authority.key();
    course.status = CourseStatus::Draft;
    course.rejection_reason = None;
    course.name = name;
    course.description = description;
    course.weight_ids = Vec::new();
    course.workload_required = workload_required;
    course.workload = 0;
    course.college_id = ctx.accounts.provider.wallet.to_string(); // Use provider wallet as ID
    course.degree_id = degree_id;
    course.resource_ids = Vec::new();

    Ok(())
}

pub fn create_weight(
    ctx: Context<CreateWeight>,
    weight_id: String,
    name: String,
    percentage: u8,
    description: Option<String>,
) -> Result<()> {
    require!(percentage <= 100, CourseError::InvalidProgress);
    
    let weight = &mut ctx.accounts.weight;
    let course = &mut ctx.accounts.course;
    
    weight.id = weight_id.clone();
    weight.course_id = course.id.clone();
    weight.name = name;
    weight.percentage = percentage;
    weight.description = description;

    // Add weight to course
    course.add_weight(weight_id)?;

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

pub fn archive_course_progress(
    ctx: Context<ArchiveCourseProgress>,
) -> Result<bool> {
    let course_student = &mut ctx.accounts.course_student;
    
    // Set status to archived/completed
    course_student.status = CourseStudentStatus::Submitted;
    course_student.updated = Clock::get()?.unix_timestamp;
    
    Ok(true)
}

pub fn update_course_progress(
    ctx: Context<UpdateCourseProgress>,
    progress: u8,
) -> Result<()> {
    let course_student = &mut ctx.accounts.course_student;
    course_student.update_progress(progress)?;
    Ok(())
}

pub fn complete_course(
    ctx: Context<CompleteCourse>,
    final_grade: f64,
) -> Result<()> {
    let course_student = &mut ctx.accounts.course_student;
    course_student.complete_course(final_grade)?;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateCourseStatus<'info> {
    #[account(
        mut,
        seeds = [Course::SEED_PREFIX.as_bytes(), course.id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [Provider::SEED_PREFIX.as_bytes(), provider_authority.key().as_ref()],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(mut)]
    pub provider_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateCourseProgress<'info> {
    #[account(
        mut,
        seeds = [CourseStudent::SEED_PREFIX.as_bytes(), course_student.course_id.as_bytes(), course_student.student_id.as_bytes()],
        bump
    )]
    pub course_student: Account<'info, CourseStudent>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteCourse<'info> {
    #[account(
        mut,
        seeds = [CourseStudent::SEED_PREFIX.as_bytes(), course_student.course_id.as_bytes(), course_student.student_id.as_bytes()],
        bump
    )]
    pub course_student: Account<'info, CourseStudent>,
    #[account(
        seeds = [Course::SEED_PREFIX.as_bytes(), course_student.course_id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [Provider::SEED_PREFIX.as_bytes(), teacher_authority.key().as_ref()],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(mut)]
    pub teacher_authority: Signer<'info>,
} 