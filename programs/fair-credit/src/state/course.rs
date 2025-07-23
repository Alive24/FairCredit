use anchor_lang::prelude::*;
use crate::types::{CourseStatus, CourseStudentStatus, CourseError};

#[account]
#[derive(InitSpace)]
pub struct Course {
    #[max_len(32)]
    pub id: String,
    pub created: i64,
    pub updated: i64,
    pub status: CourseStatus,
    #[max_len(200)]
    pub rejection_reason: Option<String>,
    #[max_len(64)]
    pub name: String,
    #[max_len(256)]
    pub description: String,
    #[max_len(20, 32)]
    pub weight_ids: Vec<String>, // Weight IDs
    pub workload_required: u32,
    pub workload: u32,
    #[max_len(32)]
    pub college_id: String,
    #[max_len(32)]
    pub degree_id: Option<String>,
    #[max_len(50, 32)]
    pub resource_ids: Vec<String>, // Associated resource IDs
}

#[account]
#[derive(InitSpace)]
pub struct CourseStudent {
    #[max_len(32)]
    pub course_id: String,
    #[max_len(32)]
    pub student_id: String,
    pub status: CourseStudentStatus,
    pub enrolled_at: i64,
    pub updated: i64,
    pub progress: u8, // 0-100 percentage
    pub final_grade: Option<f64>,
}

#[account]
#[derive(InitSpace)]
pub struct Weight {
    #[max_len(32)]
    pub id: String,
    #[max_len(32)]
    pub course_id: String,
    #[max_len(64)]
    pub name: String,
    pub percentage: u8, // 0-100
    #[max_len(100)]
    pub description: Option<String>,
}

impl Course {
    pub const SEED_PREFIX: &'static str = "course";

    pub fn add_weight(&mut self, weight_id: String) -> Result<()> {
        require!(self.weight_ids.len() < 20, CourseError::TooManyWeights);
        self.weight_ids.push(weight_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_resource(&mut self, resource_id: String) -> Result<()> {
        require!(self.resource_ids.len() < 50, CourseError::TooManyResources);
        self.resource_ids.push(resource_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_status(&mut self, status: CourseStatus, rejection_reason: Option<String>) -> Result<()> {
        self.status = status;
        self.rejection_reason = rejection_reason;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

impl CourseStudent {
    pub const SEED_PREFIX: &'static str = "course_student";

    pub fn update_progress(&mut self, progress: u8) -> Result<()> {
        require!(progress <= 100, CourseError::InvalidProgress);
        self.progress = progress;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn complete_course(&mut self, final_grade: f64) -> Result<()> {
        self.final_grade = Some(final_grade);
        self.status = if final_grade >= 60.0 { CourseStudentStatus::Passed } else { CourseStudentStatus::Failed };
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

impl Weight {
    pub const SEED_PREFIX: &'static str = "weight";
}

 