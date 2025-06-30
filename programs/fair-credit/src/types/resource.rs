use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ResourceStatus {
    Draft,
    Rejected,
    Submitted,
    Verified,
    Archived,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum SubmissionStatus {
    Submitted,
    Graded,
    Returned,
    Accepted,
} 