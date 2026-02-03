use crate::types::HubError;
use anchor_lang::prelude::*;

/// Linked list node that stores an extended list of accepted course PDAs.
#[account]
#[derive(InitSpace)]
pub struct CourseList {
    pub hub: Pubkey,
    pub index: u16,
    pub created_at: i64,
    pub updated_at: i64,
    pub next: Option<Pubkey>,
    #[max_len(250)]
    pub courses: Vec<Pubkey>,
}

impl CourseList {
    pub const SEED_PREFIX: &'static str = "course-list";
    pub const MAX_COURSES: u16 = 250;

    pub fn add_course(&mut self, course: Pubkey) -> Result<()> {
        require!(
            (self.courses.len() as u16) < Self::MAX_COURSES,
            HubError::CourseListFull
        );
        if !self.courses.contains(&course) {
            self.courses.push(course);
            self.updated_at = Clock::get()?.unix_timestamp;
        }
        Ok(())
    }

    pub fn remove_course(&mut self, course: &Pubkey) -> Result<()> {
        let before = self.courses.len();
        self.courses.retain(|c| c != course);
        require!(before != self.courses.len(), HubError::CourseNotAccepted);
        self.updated_at = Clock::get()?.unix_timestamp;
        Ok(())
    }

    pub fn is_full(&self) -> bool {
        (self.courses.len() as u16) >= Self::MAX_COURSES
    }
}
