use anchor_lang::prelude::*;
use crate::types::{ActivityKind, ActivityStatus, ResourceKind, ActivityError};

#[account]
pub struct Activity {
    pub id: String,
    pub created: i64,
    pub updated: i64,
    pub user_id: String,
    pub college_id: String,
    pub degree_id: Option<String>,
    pub weight_id: Option<String>,
    pub course_id: Option<String>,
    pub resource_id: Option<String>,
    pub data: String, // JSON string representation
    pub kind: ActivityKind,
    pub status: ActivityStatus,
    pub resource_kind: Option<ResourceKind>,
    pub grade: Option<f64>,
    pub assets: Vec<String>, // Asset IDs
    pub evidence_assets: Vec<String>, // Evidence asset IDs
}



impl Activity {
    pub const SEED_PREFIX: &'static str = "activity";
    
    pub fn space() -> usize {
        8 + // discriminator
        32 + // id (String)
        8 + // created
        8 + // updated
        32 + // user_id (String)
        32 + // college_id (String)
        33 + // degree_id (Option<String>)
        33 + // weight_id (Option<String>)
        33 + // course_id (Option<String>)
        33 + // resource_id (Option<String>)
        512 + // data (JSON string, generous allocation)
        1 + // kind enum
        1 + // status enum
        2 + // resource_kind (Option<enum>)
        9 + // grade (Option<f64>)
        4 + 10 * 32 + // assets (Vec<String>, up to 10 assets)
        4 + 10 * 32   // evidence_assets (Vec<String>, up to 10 assets)
    }

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

 