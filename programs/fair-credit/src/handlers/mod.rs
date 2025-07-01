// Handlers module - to be implemented
// This module will contain the program instruction handlers

// TODO: Implement handlers for:
// - initialize_provider
// - create_credential  
// - endorse_credential
// - mint_credential
// - verify_credential 

// Handler modules for FairCredit program instructions
pub mod activity;
pub mod course;
pub mod credential;
pub mod provider;
pub mod resource;

pub use activity::*;
pub use course::*;
pub use credential::*;
pub use provider::*;
pub use resource::*; 