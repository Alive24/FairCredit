use anchor_lang::prelude::*;
use crate::types::{Currency, DegreeStudentStatus, StudentError};

#[account]
pub struct Student {
    pub id: String,
    pub external_id: Option<String>,
    pub name_first: String,
    pub name_last: String,
    pub email: String,
    pub created: i64,
    pub updated: i64,
    pub college_id: String,
    pub degree_ids: Vec<String>, // Enrolled degrees
    pub course_ids: Vec<String>, // Enrolled courses
    pub wallet: Pubkey, // Associated wallet address
    pub is_active: bool,
}

#[account]
pub struct DegreeStudent {
    pub degree_id: String,
    pub student_id: String,
    pub currency: Option<Currency>,
    pub tuition_cost: Option<u64>,
    pub enrolled_at: i64,
    pub status: DegreeStudentStatus,
    pub progress: u8, // 0-100 percentage
    pub credits_earned: u32,
    pub credits_required: u32,
}





#[account]
pub struct StudentProfile {
    pub student_id: String,
    pub bio: Option<String>,
    pub linkedin_url: Option<String>,
    pub github_url: Option<String>,
    pub portfolio_url: Option<String>,
    pub skills: Vec<String>,
    pub achievements: Vec<String>,
    pub certifications: Vec<String>, // Credential IDs from the main credential system
}

impl Student {
    pub const SEED_PREFIX: &'static str = "student";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        33 + // external_id (Option<String>)
        64 + // name_first
        64 + // name_last
        128 + // email
        8 + // created
        8 + // updated
        32 + // college_id
        4 + 10 * 32 + // degree_ids (Vec<String>, up to 10 degrees)
        4 + 50 * 32 + // course_ids (Vec<String>, up to 50 courses)
        32 + // wallet
        1     // is_active
    }

    pub fn full_name(&self) -> String {
        format!("{} {}", self.name_first, self.name_last)
    }

    pub fn enroll_in_degree(&mut self, degree_id: String) -> Result<()> {
        require!(self.degree_ids.len() < 10, StudentError::TooManyDegrees);
        require!(!self.degree_ids.contains(&degree_id), StudentError::AlreadyEnrolled);
        self.degree_ids.push(degree_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn enroll_in_course(&mut self, course_id: String) -> Result<()> {
        require!(self.course_ids.len() < 50, StudentError::TooManyCourses);
        require!(!self.course_ids.contains(&course_id), StudentError::AlreadyEnrolled);
        self.course_ids.push(course_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_email(&mut self, new_email: String) -> Result<()> {
        require!(new_email.contains('@'), StudentError::InvalidEmail);
        self.email = new_email;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn deactivate(&mut self) -> Result<()> {
        self.is_active = false;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

impl DegreeStudent {
    pub const SEED_PREFIX: &'static str = "degree_student";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // degree_id
        32 + // student_id
        2 + // currency (Option<enum>)
        9 + // tuition_cost (Option<u64>)
        8 + // enrolled_at
        1 + // status enum
        1 + // progress
        4 + // credits_earned
        4     // credits_required
    }

    pub fn update_progress(&mut self, credits_earned: u32) -> Result<()> {
        self.credits_earned = credits_earned;
        self.progress = ((credits_earned as f64 / self.credits_required as f64) * 100.0) as u8;
        
        if self.credits_earned >= self.credits_required && self.status == DegreeStudentStatus::Active {
            self.status = DegreeStudentStatus::Graduated;
        }
        
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

impl StudentProfile {
    pub const SEED_PREFIX: &'static str = "student_profile";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // student_id
        257 + // bio (Option<String>)
        129 + // linkedin_url (Option<String>)
        129 + // github_url (Option<String>)
        129 + // portfolio_url (Option<String>)
        4 + 20 * 32 + // skills (Vec<String>, up to 20)
        4 + 20 * 32 + // achievements (Vec<String>, up to 20)
        4 + 20 * 32   // certifications (Vec<String>, up to 20)
    }

    pub fn add_skill(&mut self, skill: String) -> Result<()> {
        require!(self.skills.len() < 20, StudentError::TooManySkills);
        require!(!self.skills.contains(&skill), StudentError::DuplicateSkill);
        self.skills.push(skill);
        Ok(())
    }

    pub fn add_achievement(&mut self, achievement: String) -> Result<()> {
        require!(self.achievements.len() < 20, StudentError::TooManyAchievements);
        self.achievements.push(achievement);
        Ok(())
    }

    pub fn add_certification(&mut self, credential_id: String) -> Result<()> {
        require!(self.certifications.len() < 20, StudentError::TooManyCertifications);
        require!(!self.certifications.contains(&credential_id), StudentError::DuplicateCertification);
        self.certifications.push(credential_id);
        Ok(())
    }
}

 