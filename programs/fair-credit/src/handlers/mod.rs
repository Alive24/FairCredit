// Handlers module - to be implemented
// This module will contain the program instruction handlers

// TODO: Implement handlers for:
// - initialize_provider
// - create_credential  
// - endorse_credential
// - mint_credential
// - verify_credential 

// Handler modules for FairCredit program instructions
pub mod college_handlers;
pub mod student_handlers;
pub mod course_handlers;
pub mod resource_handlers;
pub mod activity_handlers;
pub mod credential_handlers;
pub mod provider_handlers;

pub use college_handlers::*;
pub use student_handlers::*;
pub use course_handlers::*;
pub use resource_handlers::*;
pub use activity_handlers::*;
pub use credential_handlers::*; 
pub use provider_handlers::*; 