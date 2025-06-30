use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum DegreeStudentStatus {
    Active,
    Suspended,
    Graduated,
    Withdrawn,
} 