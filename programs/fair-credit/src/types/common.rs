use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Currency {
    USD,
    EUR,
    GBP,
    SOL,
    USDC,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum ResourceKind {
    Assignment,
    AssignmentSummative,
    Meeting,
    General,
    Publication,
    PublicationReviewed,
} 