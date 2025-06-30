use anchor_lang::prelude::*;
use crate::state::*;
use crate::types::{Currency, DegreeStudentStatus, CourseStudentStatus};

#[derive(Accounts)]
#[instruction(student_id: String)]
pub struct AddStudentToCollege<'info> {
    #[account(
        init,
        payer = college_admin,
        space = Student::space(),
        seeds = [Student::SEED_PREFIX.as_bytes(), student_id.as_bytes()],
        bump
    )]
    pub student: Account<'info, Student>,
    #[account(
        mut,
        seeds = [College::SEED_PREFIX.as_bytes(), college.id.as_bytes()],
        bump,
        constraint = college.owner == college_admin.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
    /// CHECK: Student wallet address
    pub student_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(student_id: String, degree_id: String)]
pub struct AddStudentToDegree<'info> {
    #[account(
        init,
        payer = college_admin,
        space = DegreeStudent::space(),
        seeds = [DegreeStudent::SEED_PREFIX.as_bytes(), degree_id.as_bytes(), student_id.as_bytes()],
        bump
    )]
    pub degree_student: Account<'info, DegreeStudent>,
    #[account(
        mut,
        seeds = [Student::SEED_PREFIX.as_bytes(), student_id.as_bytes()],
        bump
    )]
    pub student: Account<'info, Student>,
    #[account(
        seeds = [Degree::SEED_PREFIX.as_bytes(), degree_id.as_bytes()],
        bump
    )]
    pub degree: Account<'info, Degree>,
    #[account(
        seeds = [College::SEED_PREFIX.as_bytes(), degree.college_id.as_bytes()],
        bump,
        constraint = college.owner == college_admin.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(student_id: String)]
pub struct CreateStudentProfile<'info> {
    #[account(
        init,
        payer = student_authority,
        space = StudentProfile::space(),
        seeds = [StudentProfile::SEED_PREFIX.as_bytes(), student_id.as_bytes()],
        bump
    )]
    pub student_profile: Account<'info, StudentProfile>,
    #[account(
        seeds = [Student::SEED_PREFIX.as_bytes(), student_id.as_bytes()],
        bump,
        constraint = student.wallet == student_authority.key()
    )]
    pub student: Account<'info, Student>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

pub fn add_student_to_college(
    ctx: Context<AddStudentToCollege>,
    student_id: String,
    email: String,
    name_first: Option<String>,
    name_last: Option<String>,
    external_id: Option<String>,
) -> Result<()> {
    let student = &mut ctx.accounts.student;
    let college = &mut ctx.accounts.college;
    let clock = Clock::get()?;
    
    student.id = student_id;
    student.external_id = external_id;
    student.name_first = name_first.unwrap_or_else(|| "Unknown".to_string());
    student.name_last = name_last.unwrap_or_else(|| "Student".to_string());
    student.email = email;
    student.created = clock.unix_timestamp;
    student.updated = clock.unix_timestamp;
    student.college_id = college.id.clone();
    student.degree_ids = Vec::new();
    student.course_ids = Vec::new();
    student.wallet = ctx.accounts.student_wallet.key();
    student.is_active = true;

    // Update college student count
    let current_count = college.student_count;
    college.update_student_count(current_count + 1)?;

    Ok(())
}

pub fn add_student_to_degree(
    ctx: Context<AddStudentToDegree>,
    student_id: String,
    degree_id: String,
    currency: Option<Currency>,
    tuition_cost: Option<u64>,
) -> Result<()> {
    let degree_student = &mut ctx.accounts.degree_student;
    let student = &mut ctx.accounts.student;
    let degree = &ctx.accounts.degree;
    let clock = Clock::get()?;
    
    degree_student.degree_id = degree_id.clone();
    degree_student.student_id = student_id;
    degree_student.currency = currency;
    degree_student.tuition_cost = tuition_cost;
    degree_student.enrolled_at = clock.unix_timestamp;
    degree_student.status = DegreeStudentStatus::Active;
    degree_student.progress = 0;
    degree_student.credits_earned = 0;
    degree_student.credits_required = degree.total_credits;

    // Add degree to student's enrolled degrees
    student.enroll_in_degree(degree_id)?;

    Ok(())
}

pub fn create_student_profile(
    ctx: Context<CreateStudentProfile>,
    student_id: String,
    bio: Option<String>,
    linkedin_url: Option<String>,
    github_url: Option<String>,
    portfolio_url: Option<String>,
) -> Result<()> {
    let student_profile = &mut ctx.accounts.student_profile;
    
    student_profile.student_id = student_id;
    student_profile.bio = bio;
    student_profile.linkedin_url = linkedin_url;
    student_profile.github_url = github_url;
    student_profile.portfolio_url = portfolio_url;
    student_profile.skills = Vec::new();
    student_profile.achievements = Vec::new();
    student_profile.certifications = Vec::new();

    Ok(())
}

pub fn change_email(
    ctx: Context<ChangeEmail>,
    new_email: String,
) -> Result<()> {
    let student = &mut ctx.accounts.student;
    student.update_email(new_email)?;
    Ok(())
}

pub fn enroll_student_in_course(
    ctx: Context<EnrollStudentInCourse>,
    course_id: String,
) -> Result<()> {
    let course_student = &mut ctx.accounts.course_student;
    let student = &mut ctx.accounts.student;
    let clock = Clock::get()?;
    
    course_student.course_id = course_id.clone();
    course_student.student_id = student.id.clone();
    course_student.status = CourseStudentStatus::Active;
    course_student.enrolled_at = clock.unix_timestamp;
    course_student.updated = clock.unix_timestamp;
    course_student.progress = 0;
    course_student.final_grade = None;

    // Add course to student's enrolled courses
    student.enroll_in_course(course_id)?;

    Ok(())
}

#[derive(Accounts)]
pub struct ChangeEmail<'info> {
    #[account(
        mut,
        seeds = [Student::SEED_PREFIX.as_bytes(), student.id.as_bytes()],
        bump,
        constraint = student.wallet == student_authority.key()
    )]
    pub student: Account<'info, Student>,
    #[account(mut)]
    pub student_authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(course_id: String)]
pub struct EnrollStudentInCourse<'info> {
    #[account(
        init,
        payer = college_admin,
        space = CourseStudent::space(),
        seeds = [CourseStudent::SEED_PREFIX.as_bytes(), course_id.as_bytes(), student.id.as_bytes()],
        bump
    )]
    pub course_student: Account<'info, CourseStudent>,
    #[account(
        mut,
        seeds = [Student::SEED_PREFIX.as_bytes(), student.id.as_bytes()],
        bump
    )]
    pub student: Account<'info, Student>,
    #[account(
        seeds = [Course::SEED_PREFIX.as_bytes(), course_id.as_bytes()],
        bump
    )]
    pub course: Account<'info, Course>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
    pub system_program: Program<'info, System>,
} 