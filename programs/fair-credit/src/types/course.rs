use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum CourseStatus {
    Draft,
    Rejected,
    Verified,
    Archived,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum CourseStudentStatus {
    Active,
    Submitted,
    Passed,
    Failed,
} 