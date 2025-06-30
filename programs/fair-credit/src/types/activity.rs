use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ActivityKind {
    AddFeedback,
    AddGrade,
    SubmitAssignment,
    ConsumeResource,
    AttendMeeting,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ActivityStatus {
    Active,
    Archived,
    Pending,
} 