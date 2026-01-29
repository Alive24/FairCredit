use anchor_lang::prelude::*;
use crate::types::{ActivityKind, ActivityStatus, ResourceKind, ActivityError};

#[account]
#[derive(InitSpace)]
pub struct Activity {
    #[max_len(32)]
    pub id: String,
    pub created: i64,
    pub updated: i64,
    #[max_len(32)]
    pub user_id: String,
    #[max_len(32)]
    pub college_id: String,
    #[max_len(32)]
    pub degree_id: Option<String>,
    #[max_len(32)]
    pub weight_id: Option<String>,
    #[max_len(32)]
    pub course_id: Option<String>,
    #[max_len(32)]
    pub resource_id: Option<String>,
    #[max_len(512)]
    pub data: String, // JSON string representation
    pub kind: ActivityKind,
    pub status: ActivityStatus,
    pub resource_kind: Option<ResourceKind>,
    pub grade: Option<f64>,
    #[max_len(10, 32)]
    pub assets: Vec<String>, // Asset IDs
    #[max_len(10, 32)]
    pub evidence_assets: Vec<String>, // Evidence asset IDs
}



impl Activity {
    pub const SEED_PREFIX: &'static str = "activity";

    pub fn add_asset(&mut self, asset_id: String) -> Result<()> {
        require!(self.assets.len() < 10, ActivityError::TooManyAssets);
        self.assets.push(asset_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn add_evidence_asset(&mut self, asset_id: String) -> Result<()> {
        require!(self.evidence_assets.len() < 10, ActivityError::TooManyAssets);
        self.evidence_assets.push(asset_id);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn update_grade(&mut self, grade: f64) -> Result<()> {
        self.grade = Some(grade);
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn archive(&mut self) -> Result<()> {
        self.status = ActivityStatus::Archived;
        self.updated = Clock::get()?.unix_timestamp;
        Ok(())
    }
}