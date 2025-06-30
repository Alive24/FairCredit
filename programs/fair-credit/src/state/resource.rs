use anchor_lang::prelude::*;
use crate::types::{ResourceKind, ResourceStatus, SubmissionStatus, ResourceError};

#[account]
pub struct Resource {
    pub id: String,
    pub name: String,
    pub kind: ResourceKind,
    pub status: ResourceStatus,
    pub is_grade_required: bool,
    pub external_id: Option<String>,
    pub content: Option<String>,
    pub workload: Option<u32>, // in minutes
    pub course_id: String,
    pub weight_ids: Vec<String>,
    pub asset_ids: Vec<String>,
    pub tags: Vec<String>,
    pub teacher_ids: Vec<String>,
    pub created: i64,
    pub updated: i64,
    pub created_by: Pubkey,
}

#[account]
pub struct Asset {
    pub id: String,
    pub content_type: Option<String>,
    pub file_name: Option<String>,
    pub import_url: Option<String>,
    pub ipfs_hash: Option<String>, // For decentralized storage
    pub file_size: Option<u64>,
    pub created: i64,
    pub uploaded_by: Pubkey,
    pub resource_id: Option<String>, // Associated resource if any
}

#[account]
pub struct ResourceSubmission {
    pub id: String,
    pub resource_id: String,
    pub student_id: String,
    pub content: Option<String>,
    pub asset_ids: Vec<String>,
    pub evidence_asset_ids: Vec<String>,
    pub submitted_at: i64,
    pub status: SubmissionStatus,
    pub grade: Option<f64>,
    pub feedback: Option<String>,
    pub graded_by: Option<Pubkey>,
    pub graded_at: Option<i64>,
}



impl Resource {
    pub const SEED_PREFIX: &'static str = "resource";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        128 + // name
        1 + // kind enum
        1 + // status enum
        1 + // is_grade_required
        33 + // external_id (Option<String>)
        513 + // content (Option<String>)
        5 + // workload (Option<u32>)
        32 + // course_id
        4 + 10 * 32 + // weight_ids (Vec<String>, up to 10)
        4 + 20 * 32 + // asset_ids (Vec<String>, up to 20)
        4 + 10 * 32 + // tags (Vec<String>, up to 10)
        4 + 5 * 32 + // teacher_ids (Vec<String>, up to 5)
        8 + // created
        8 + // updated
        32    // created_by
    }

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
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        65 + // content_type (Option<String>)
        257 + // file_name (Option<String>)
        257 + // import_url (Option<String>)
        65 + // ipfs_hash (Option<String>)
        9 + // file_size (Option<u64>)
        8 + // created
        32 + // uploaded_by
        33    // resource_id (Option<String>)
    }

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
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id
        32 + // resource_id
        32 + // student_id
        513 + // content (Option<String>)
        4 + 10 * 32 + // asset_ids (Vec<String>, up to 10)
        4 + 10 * 32 + // evidence_asset_ids (Vec<String>, up to 10)
        8 + // submitted_at
        1 + // status enum
        9 + // grade (Option<f64>)
        513 + // feedback (Option<String>)
        33 + // graded_by (Option<Pubkey>)
        9     // graded_at (Option<i64>)
    }

    pub fn grade_submission(&mut self, grade: f64, feedback: Option<String>, graded_by: Pubkey) -> Result<()> {
        require!(grade >= 0.0 && grade <= 100.0, ResourceError::InvalidGrade);
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

 