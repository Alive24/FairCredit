use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum Currency {
    USD,
    EUR,
    GBP,
    SOL,
    USDC,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug, InitSpace)]
pub enum ResourceKind {
    Assignment,
    AssignmentSummative,
    Meeting,
    General,
    Publication,
    PublicationReviewed,
} 