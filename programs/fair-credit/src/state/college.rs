use anchor_lang::prelude::*;
use crate::types::{Currency, CollegeStatus, Address, DegreeType, DegreeStatus, CollegeError};

#[account]
pub struct College {
    pub id: String,
    pub name: String,
    pub description: String,
    pub status: CollegeStatus,
    pub website_url: Option<String>,
    pub contact_email: String,
    pub phone: Option<String>,
    pub address: Option<Address>,
    pub accreditation_info: Option<String>,
    pub logo_asset_id: Option<String>,
    pub established_year: Option<u16>,
    pub student_count: u32,
    pub faculty_count: u32,
    pub degree_ids: Vec<String>,
    pub course_ids: Vec<String>,
    pub created: i64,
    pub updated: i64,
    pub owner: Pubkey, // College admin wallet
    pub is_active: bool,
}



#[account]
pub struct Degree {
    pub id: String,
    pub college_id: String,
    pub name: String,
    pub description: String,
    pub degree_type: DegreeType,
    pub field_of_study: String,
    pub duration_months: u16,
    pub total_credits: u32,
    pub course_ids: Vec<String>, // Required courses
    pub elective_course_ids: Vec<String>, // Optional courses
    pub prerequisites: Vec<String>, // Prerequisite degree IDs
    pub tuition_cost: Option<u64>,
    pub currency: Option<Currency>,
    pub status: DegreeStatus,
    pub created: i64,
    pub updated: i64,
}





#[account]
pub struct Faculty {
    pub id: String,
    pub college_id: String,
    pub name_first: String,
    pub name_last: String,
    pub email: String,
    pub title: String,
    pub department: Option<String>,
    pub bio: Option<String>,
    pub qualifications: Vec<String>,
    pub course_ids: Vec<String>, // Courses they teach
    pub wallet: Pubkey,
    pub is_active: bool,
    pub created: i64,
    pub updated: i64,
}

impl College {
    pub const SEED_PREFIX: &'static str = "college";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        128 + // name
        512 + // description
        1 + // status enum
        129 + // website_url (Option<String>)
        128 + // contact_email
        33 + // phone (Option<String>)
        150 + // address (Option<Address>)
        257 + // accreditation_info (Option<String>)
        33 + // logo_asset_id (Option<String>)
        3 + // established_year (Option<u16>)
        4 + // student_count
        4 + // faculty_count
        4 + 50 * 32 + // degree_ids (Vec<String>, up to 50)
        4 + 200 * 32 + // course_ids (Vec<String>, up to 200)
        8 + // created
        8 + // updated
        32 + // owner
        1     // is_active
    }

    pub fn add_degree(&mut self, degree_id: String) -> Result<()> {
        require!(self.degree_ids.len() < 50, CollegeError::TooManyDegrees);
        require!(!self.degree_ids.contains(&degree_id), CollegeError::DegreeAlreadyExists);
        self.degree_ids.push(degree_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_course(&mut self, course_id: String) -> Result<()> {
        require!(self.course_ids.len() < 200, CollegeError::TooManyCourses);
        require!(!self.course_ids.contains(&course_id), CollegeError::CourseAlreadyExists);
        self.course_ids.push(course_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_status(&mut self, status: CollegeStatus) -> Result<()> {
        self.status = status;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_student_count(&mut self, count: u32) -> Result<()> {
        self.student_count = count;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_faculty_count(&mut self, count: u32) -> Result<()> {
        self.faculty_count = count;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}



impl Degree {
    pub const SEED_PREFIX: &'static str = "degree";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        32 + // college_id
        128 + // name
        512 + // description
        1 + // degree_type enum
        128 + // field_of_study
        2 + // duration_months
        4 + // total_credits
        4 + 30 * 32 + // course_ids (Vec<String>, up to 30)
        4 + 20 * 32 + // elective_course_ids (Vec<String>, up to 20)
        4 + 5 * 32 + // prerequisites (Vec<String>, up to 5)
        9 + // tuition_cost (Option<u64>)
        2 + // currency (Option<Currency>)
        1 + // status enum
        8 + // created
        8     // updated
    }

    pub fn add_required_course(&mut self, course_id: String) -> Result<()> {
        require!(self.course_ids.len() < 30, CollegeError::TooManyRequiredCourses);
        require!(!self.course_ids.contains(&course_id), CollegeError::CourseAlreadyRequired);
        self.course_ids.push(course_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_elective_course(&mut self, course_id: String) -> Result<()> {
        require!(self.elective_course_ids.len() < 20, CollegeError::TooManyElectiveCourses);
        require!(!self.elective_course_ids.contains(&course_id), CollegeError::ElectiveAlreadyExists);
        self.elective_course_ids.push(course_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_prerequisite(&mut self, prerequisite_id: String) -> Result<()> {
        require!(self.prerequisites.len() < 5, CollegeError::TooManyPrerequisites);
        require!(!self.prerequisites.contains(&prerequisite_id), CollegeError::PrerequisiteAlreadyExists);
        self.prerequisites.push(prerequisite_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn calculate_tuition_in_lamports(&self) -> Option<u64> {
        match self.currency {
            Some(Currency::SOL) => self.tuition_cost,
            Some(Currency::USDC) => self.tuition_cost.map(|cost| cost * 1_000_000), // USDC has 6 decimals
            _ => None,
        }
    }
}

impl Faculty {
    pub const SEED_PREFIX: &'static str = "faculty";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        32 + // college_id
        64 + // name_first
        64 + // name_last
        128 + // email
        64 + // title
        65 + // department (Option<String>)
        513 + // bio (Option<String>)
        4 + 10 * 64 + // qualifications (Vec<String>, up to 10)
        4 + 20 * 32 + // course_ids (Vec<String>, up to 20)
        32 + // wallet
        1 + // is_active
        8 + // created
        8     // updated
    }

    pub fn full_name(&self) -> String {
        format!("{} {}", self.name_first, self.name_last)
    }

    pub fn add_course(&mut self, course_id: String) -> Result<()> {
        require!(self.course_ids.len() < 20, CollegeError::TooManyCoursesForFaculty);
        require!(!self.course_ids.contains(&course_id), CollegeError::FacultyCourseAlreadyExists);
        self.course_ids.push(course_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_qualification(&mut self, qualification: String) -> Result<()> {
        require!(self.qualifications.len() < 10, CollegeError::TooManyQualifications);
        self.qualifications.push(qualification);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

 