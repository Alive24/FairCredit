// Handlers module - to be implemented
// This module will contain the program instruction handlers

// TODO: Implement handlers for:
// - initialize_provider
// - create_credential  
// - endorse_credential
// - mint_credential
// - verify_credential 

// Handler modules for FairCredit program instructions
pub mod college;
pub mod student;
pub mod course;
pub mod resource;
pub mod activity;
pub mod credential;
pub mod provider;

pub use college::*;
pub use student::*;
pub use course::*;
pub use resource::*;
pub use activity::*;
pub use credential::*; 
pub use provider::*; 