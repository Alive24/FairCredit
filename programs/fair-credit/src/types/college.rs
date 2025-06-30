use crate::types::common::Currency;
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum CollegeStatus {
    Draft,
    Verified,
    Rejected,
    Archived,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Address {
    pub street: String,
    pub city: String,
    pub state: Option<String>,
    pub country: String,
    pub postal_code: Option<String>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DegreeType {
    Associate,
    Bachelor,
    Master,
    Doctorate,
    Certificate,
    Diploma,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DegreeStatus {
    Draft,
    Active,
    Suspended,
    Archived,
}

impl Address {
    pub fn format_full(&self) -> String {
        let mut parts = vec![self.street.clone(), self.city.clone()];
        
        if let Some(state) = &self.state {
            parts.push(state.clone());
        }
        
        parts.push(self.country.clone());
        
        if let Some(postal) = &self.postal_code {
            parts.push(postal.clone());
        }
        
        parts.join(", ")
    }
} 