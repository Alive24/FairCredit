use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum ResourceStatus {
    Draft,
    Rejected,
    Submitted,
    Verified,
    Archived,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum SubmissionStatus {
    Submitted,
    Graded,
    Returned,
    Accepted,
} 