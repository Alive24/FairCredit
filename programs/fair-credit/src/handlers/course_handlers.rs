use anchor_lang::prelude::*;
use crate::state::*;
use crate::types::{CourseStatus, CourseStudentStatus, CourseError};

#[derive(Accounts)]
#[instruction(course_id: String)]
pub struct CreateCourse<'info> {
    #[account(
        init,
        payer = college_admin,
        space = Course::space(),
        seeds = [Course::SEED_PREFIX.as_bytes(), course_id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(
        mut,
        seeds = [College::SEED_PREFIX.as_bytes(), college.id.as_bytes()],
        bump,
        constraint = college.owner == college_admin.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(weight_id: String)]
pub struct CreateWeight<'info> {
    #[account(
        init,
        payer = college_admin,
        space = Weight::space(),
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
        seeds = [College::SEED_PREFIX.as_bytes(), course.college_id.as_bytes()],
        bump,
        constraint = college.owner == college_admin.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
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
        seeds = [College::SEED_PREFIX.as_bytes(), course.college_id.as_bytes()],
        bump,
        constraint = college.owner == college_admin.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
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
    let college = &mut ctx.accounts.college;
    let clock = Clock::get()?;
    
    course.id = course_id.clone();
    course.created = clock.unix_timestamp;
    course.updated = clock.unix_timestamp;
    course.status = CourseStatus::Draft;
    course.rejection_reason = None;
    course.name = name;
    course.description = description;
    course.weight_ids = Vec::new();
    course.workload_required = workload_required;
    course.workload = 0;
    course.college_id = college.id.clone();
    course.degree_id = degree_id;
    course.resource_ids = Vec::new();

    // Add course to college
    college.add_course(course_id)?;

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
        seeds = [College::SEED_PREFIX.as_bytes(), course.college_id.as_bytes()],
        bump,
        constraint = college.owner == college_admin.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateCourseProgress<'info> {
    #[account(
        mut,
        seeds = [CourseStudent::SEED_PREFIX.as_bytes(), course_student.course_id.as_bytes(), course_student.student_id.as_bytes()],
        bump
    )]
    pub course_student: Account<'info, CourseStudent>,
    #[account(
        seeds = [Student::SEED_PREFIX.as_bytes(), course_student.student_id.as_bytes()],
        bump,
        constraint = student.wallet == student_authority.key()
    )]
    pub student: Account<'info, Student>,
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
        seeds = [College::SEED_PREFIX.as_bytes(), course.college_id.as_bytes()],
        bump,
        constraint = college.owner == teacher_authority.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub teacher_authority: Signer<'info>,
} 