use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum ActivityKind {
    AddFeedback,
    AddGrade,
    SubmitAssignment,
    ConsumeResource,
    AttendMeeting,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum ActivityStatus {
    Active,
    Archived,
    Pending,
} 