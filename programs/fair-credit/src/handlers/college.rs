use anchor_lang::prelude::*;
use crate::state::*;
use crate::types::{CollegeStatus, Address, DegreeType, DegreeStatus, Currency};

#[derive(Accounts)]
#[instruction(college_id: String)]
pub struct InitializeCollege<'info> {
    #[account(
        init,
        payer = owner,
        space = College::space(),
        seeds = [College::SEED_PREFIX.as_bytes(), college_id.as_bytes()],
        bump
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(degree_id: String)]
pub struct CreateDegree<'info> {
    #[account(
        init,
        payer = owner,
        space = Degree::space(),
        seeds = [Degree::SEED_PREFIX.as_bytes(), degree_id.as_bytes()],
        bump
    )]
    pub degree: Account<'info, Degree>,
    #[account(
        mut,
        seeds = [College::SEED_PREFIX.as_bytes(), college.id.as_bytes()],
        bump,
        constraint = college.owner == owner.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(faculty_id: String)]
pub struct AddFaculty<'info> {
    #[account(
        init,
        payer = college_admin,
        space = Faculty::space(),
        seeds = [Faculty::SEED_PREFIX.as_bytes(), faculty_id.as_bytes()],
        bump
    )]
    pub faculty: Account<'info, Faculty>,
    #[account(
        mut,
        seeds = [College::SEED_PREFIX.as_bytes(), college.id.as_bytes()],
        bump,
        constraint = college.owner == college_admin.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub college_admin: Signer<'info>,
    /// CHECK: Faculty wallet address
    pub faculty_wallet: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_college(
    ctx: Context<InitializeCollege>,
    college_id: String,
    name: String,
    description: String,
    contact_email: String,
    website_url: Option<String>,
    phone: Option<String>,
    address: Option<Address>,
) -> Result<()> {
    let college = &mut ctx.accounts.college;
    let clock = Clock::get()?;
    
    college.id = college_id;
    college.name = name;
    college.description = description;
    college.status = CollegeStatus::Draft;
    college.website_url = website_url;
    college.contact_email = contact_email;
    college.phone = phone;
    college.address = address;
    college.accreditation_info = None;
    college.logo_asset_id = None;
    college.established_year = None;
    college.student_count = 0;
    college.faculty_count = 0;
    college.degree_ids = Vec::new();
    college.course_ids = Vec::new();
    college.created = clock.unix_timestamp;
    college.updated = clock.unix_timestamp;
    college.owner = ctx.accounts.owner.key();
    college.is_active = true;

    Ok(())
}

pub fn create_degree(
    ctx: Context<CreateDegree>,
    degree_id: String,
    name: String,
    description: String,
    degree_type: DegreeType,
    field_of_study: String,
    duration_months: u16,
    total_credits: u32,
    tuition_cost: Option<u64>,
    currency: Option<Currency>,
) -> Result<()> {
    let degree = &mut ctx.accounts.degree;
    let college = &mut ctx.accounts.college;
    let clock = Clock::get()?;
    
    degree.id = degree_id.clone();
    degree.college_id = college.id.clone();
    degree.name = name;
    degree.description = description;
    degree.degree_type = degree_type;
    degree.field_of_study = field_of_study;
    degree.duration_months = duration_months;
    degree.total_credits = total_credits;
    degree.course_ids = Vec::new();
    degree.elective_course_ids = Vec::new();
    degree.prerequisites = Vec::new();
    degree.tuition_cost = tuition_cost;
    degree.currency = currency;
    degree.status = DegreeStatus::Draft;
    degree.created = clock.unix_timestamp;
    degree.updated = clock.unix_timestamp;

    // Add degree to college
    college.add_degree(degree_id)?;

    Ok(())
}

pub fn add_faculty(
    ctx: Context<AddFaculty>,
    faculty_id: String,
    name_first: String,
    name_last: String,
    email: String,
    title: String,
    department: Option<String>,
    bio: Option<String>,
    qualifications: Vec<String>,
) -> Result<()> {
    let faculty = &mut ctx.accounts.faculty;
    let college = &mut ctx.accounts.college;
    let clock = Clock::get()?;
    
    faculty.id = faculty_id;
    faculty.college_id = college.id.clone();
    faculty.name_first = name_first;
    faculty.name_last = name_last;
    faculty.email = email;
    faculty.title = title;
    faculty.department = department;
    faculty.bio = bio;
    faculty.qualifications = qualifications;
    faculty.course_ids = Vec::new();
    faculty.wallet = ctx.accounts.faculty_wallet.key();
    faculty.is_active = true;
    faculty.created = clock.unix_timestamp;
    faculty.updated = clock.unix_timestamp;

    // Update faculty count
    let current_count = college.faculty_count;
    college.update_faculty_count(current_count + 1)?;

    Ok(())
}

pub fn update_college_status(
    ctx: Context<UpdateCollegeStatus>,
    status: CollegeStatus,
) -> Result<()> {
    let college = &mut ctx.accounts.college;
    college.update_status(status)?;
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateCollegeStatus<'info> {
    #[account(
        mut,
        seeds = [College::SEED_PREFIX.as_bytes(), college.id.as_bytes()],
        bump,
        constraint = college.owner == owner.key()
    )]
    pub college: Account<'info, College>,
    #[account(mut)]
    pub owner: Signer<'info>,
} 