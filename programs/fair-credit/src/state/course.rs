use anchor_lang::prelude::*;
use crate::types::{CourseStatus, CourseStudentStatus, CourseError};

#[account]
pub struct Course {
    pub id: String,
    pub created: i64,
    pub updated: i64,
    pub status: CourseStatus,
    pub rejection_reason: Option<String>,
    pub name: String,
    pub description: String,
    pub weight_ids: Vec<String>, // Weight IDs
    pub workload_required: u32,
    pub workload: u32,
    pub college_id: String,
    pub degree_id: Option<String>,
    pub resource_ids: Vec<String>, // Associated resource IDs
}

#[account]
pub struct CourseStudent {
    pub course_id: String,
    pub student_id: String,
    pub status: CourseStudentStatus,
    pub enrolled_at: i64,
    pub updated: i64,
    pub progress: u8, // 0-100 percentage
    pub final_grade: Option<f64>,
}

#[account]
pub struct Weight {
    pub id: String,
    pub course_id: String,
    pub name: String,
    pub percentage: u8, // 0-100
    pub description: Option<String>,
}

impl Course {
    pub const SEED_PREFIX: &'static str = "course";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        8 + // created
        8 + // updated
        1 + // status enum
        33 + // rejection_reason (Option<String>)
        64 + // name
        256 + // description
        4 + 20 * 32 + // weight_ids (Vec<String>, up to 20 weights)
        4 + // workload_required
        4 + // workload
        32 + // college_id
        33 + // degree_id (Option<String>)
        4 + 50 * 32   // resource_ids (Vec<String>, up to 50 resources)
    }

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
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // course_id
        32 + // student_id
        1 + // status enum
        8 + // enrolled_at
        8 + // updated
        1 + // progress
        9     // final_grade (Option<f64>)
    }

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
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        32 + // course_id
        64 + // name
        1 + // percentage
        33    // description (Option<String>)
    }
}

 