pub mod common;
pub mod credential;
pub mod provider;
pub mod verification;
pub mod activity;
pub mod course;
pub mod student;
pub mod resource;
pub mod college;
pub mod errors;

// Re-export commonly used types
pub use common::*;
pub use credential::*;
pub use provider::*;
pub use verification::*;
pub use activity::*;
pub use course::*;
pub use student::*;
pub use resource::*;
pub use college::*;
pub use errors::*; 