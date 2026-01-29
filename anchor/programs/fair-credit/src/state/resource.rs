use anchor_lang::prelude::*;
use crate::types::{ResourceKind, ResourceStatus, SubmissionStatus, ResourceError};

#[account]
#[derive(InitSpace)]
pub struct Resource {
    #[max_len(32)]
    pub id: String,
    #[max_len(128)]
    pub name: String,
    pub kind: ResourceKind,
    pub status: ResourceStatus,
    pub is_grade_required: bool,
    #[max_len(32)]
    pub external_id: Option<String>,
    #[max_len(512)]
    pub content: Option<String>,
    pub workload: Option<u32>, // in minutes
    #[max_len(32)]
    pub course_id: String,
    #[max_len(10, 32)]
    pub weight_ids: Vec<String>,
    #[max_len(20, 32)]
    pub asset_ids: Vec<String>,
    #[max_len(10, 32)]
    pub tags: Vec<String>,
    #[max_len(5, 32)]
    pub teacher_ids: Vec<String>,
    pub created: i64,
    pub updated: i64,
    pub created_by: Pubkey,
}

#[account]
#[derive(InitSpace)]
pub struct Asset {
    #[max_len(32)]
    pub id: String,
    #[max_len(64)]
    pub content_type: Option<String>,
    #[max_len(256)]
    pub file_name: Option<String>,
    #[max_len(256)]
    pub import_url: Option<String>,
    #[max_len(64)]
    pub ipfs_hash: Option<String>, // For decentralized storage
    pub file_size: Option<u64>,
    pub created: i64,
    pub uploaded_by: Pubkey,
    #[max_len(32)]
    pub resource_id: Option<String>, // Associated resource if any
}

#[account]
#[derive(InitSpace)]
pub struct ResourceSubmission {
    #[max_len(32)]
    pub id: String,
    #[max_len(32)]
    pub resource_id: String,
    #[max_len(32)]
    pub student_id: String,
    #[max_len(512)]
    pub content: Option<String>,
    #[max_len(10, 32)]
    pub asset_ids: Vec<String>,
    #[max_len(10, 32)]
    pub evidence_asset_ids: Vec<String>,
    pub submitted_at: i64,
    pub status: SubmissionStatus,
    pub grade: Option<f64>,
    #[max_len(512)]
    pub feedback: Option<String>,
    pub graded_by: Option<Pubkey>,
    pub graded_at: Option<i64>,
}



impl Resource {
    pub const SEED_PREFIX: &'static str = "resource";

    pub fn add_asset(&mut self, asset_id: String) -> Result<()> {
        require!(self.asset_ids.len() < 20, ResourceError::TooManyAssets);
        self.asset_ids.push(asset_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_tag(&mut self, tag: String) -> Result<()> {
        require!(self.tags.len() < 10, ResourceError::TooManyTags);
        require!(!self.tags.contains(&tag), ResourceError::DuplicateTag);
        self.tags.push(tag);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_teacher(&mut self, teacher_id: String) -> Result<()> {
        require!(self.teacher_ids.len() < 5, ResourceError::TooManyTeachers);
        require!(!self.teacher_ids.contains(&teacher_id), ResourceError::TeacherAlreadyAssigned);
        self.teacher_ids.push(teacher_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_status(&mut self, status: ResourceStatus) -> Result<()> {
        self.status = status;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_content(&mut self, content: String) -> Result<()> {
        require!(content.len() <= 512, ResourceError::ContentTooLong);
        self.content = Some(content);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}

impl Asset {
    pub const SEED_PREFIX: &'static str = "asset";

    pub fn set_ipfs_hash(&mut self, hash: String) -> Result<()> {
        require!(hash.len() <= 64, ResourceError::InvalidIPFSHash);
        self.ipfs_hash = Some(hash);
        Ok(())
    }

    pub fn is_image(&self) -> bool {
        if let Some(content_type) = &self.content_type {
            content_type.starts_with("image/")
        } else {
            false
        }
    }

    pub fn is_document(&self) -> bool {
        if let Some(content_type) = &self.content_type {
            matches!(content_type.as_str(), "application/pdf" | "application/msword" | "text/plain")
        } else {
            false
        }
    }
}

impl ResourceSubmission {
    pub const SEED_PREFIX: &'static str = "submission";

    pub fn grade_submission(&mut self, grade: f64, feedback: Option<String>, graded_by: Pubkey) -> Result<()> {
        require_gte!(grade, 0.0, ResourceError::InvalidGrade);
        require!(grade <= 100.0, ResourceError::InvalidGrade);
        self.grade = Some(grade);
        self.feedback = feedback;
        self.graded_by = Some(graded_by);
        self.graded_at = Some(Clock::get()?.unix_timestamp);
        self.status = SubmissionStatus::Graded;
        Ok(())
    }

    pub fn return_for_revision(&mut self, feedback: String) -> Result<()> {
        self.feedback = Some(feedback);
        self.status = SubmissionStatus::Returned;
        Ok(())
    }

    pub fn accept_submission(&mut self) -> Result<()> {
        require!(self.status == SubmissionStatus::Graded, ResourceError::SubmissionNotGraded);
        self.status = SubmissionStatus::Accepted;
        Ok(())
    }

    pub fn add_asset(&mut self, asset_id: String) -> Result<()> {
        require!(self.asset_ids.len() < 10, ResourceError::TooManyAssets);
        self.asset_ids.push(asset_id);
        Ok(())
    }

    pub fn add_evidence_asset(&mut self, asset_id: String) -> Result<()> {
        require!(self.evidence_asset_ids.len() < 10, ResourceError::TooManyAssets);
        self.evidence_asset_ids.push(asset_id);
        Ok(())
    }
}

 