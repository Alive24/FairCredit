// Suppress deprecation warning from Anchor's internal code generation
// This warning comes from Anchor 0.31.1's #[program] macro using the deprecated
// AccountInfo::realloc instead of AccountInfo::resize. This will be fixed in a
// future Anchor release.
#![allow(deprecated)]

use anchor_lang::prelude::*;

pub mod types;
pub mod state;
pub mod handlers;
pub mod events;

// Use specific imports instead of wildcards
use handlers::provider::*;
use handlers::verifier_update::*;
use handlers::credential::*;
use handlers::hub::*;
use handlers::course::*;
use state::HubConfig;

declare_id!("BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk");

#[program]
pub mod fair_credit {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn initialize_provider(
        ctx: Context<InitializeProvider>,
        name: String,
        description: String,
        website: String,
        email: String,
        provider_type: String,
    ) -> Result<()> {
        handlers::provider::initialize_provider(ctx, name, description, website, email, provider_type)
    }

    pub fn initialize_verifier(
        ctx: Context<InitializeVerifier>,
    ) -> Result<()> {
        handlers::provider::initialize_verifier(ctx)
    }

    pub fn suspend_provider(
        ctx: Context<SuspendProvider>,
    ) -> Result<()> {
        handlers::provider::suspend_provider(ctx)
    }

    pub fn unsuspend_provider(
        ctx: Context<UnsuspendProvider>,
    ) -> Result<()> {
        handlers::provider::unsuspend_provider(ctx)
    }

    pub fn set_provider_reputation(
        ctx: Context<SetProviderReputation>,
        reputation_score: u64,
        note: Option<String>,
    ) -> Result<()> {
        handlers::provider::set_provider_reputation(ctx, reputation_score, note)
    }

    pub fn expand_verifier_capacity(
        ctx: Context<ExpandVerifierCapacity>,
    ) -> Result<()> {
        handlers::verifier_update::expand_verifier_capacity(ctx)
    }

    pub fn create_credential(
        ctx: Context<CreateCredential>,
        credential_id: u64,
        title: String,
        description: String,
        skills_acquired: Vec<String>,
        research_output: Option<String>,
        mentor_endorsement: String,
        completion_date: i64,
        ipfs_hash: String,
    ) -> Result<()> {
        handlers::credential::create_credential(
            ctx,
            credential_id,
            title,
            description,
            skills_acquired,
            research_output,
            mentor_endorsement,
            completion_date,
            ipfs_hash,
        )
    }

    pub fn endorse_credential(
        ctx: Context<EndorseCredential>,
        endorsement_message: String,
    ) -> Result<()> {
        handlers::credential::endorse_credential(ctx, endorsement_message)
    }

    pub fn verify_credential(
        ctx: Context<VerifyCredential>,
    ) -> Result<()> {
        handlers::credential::verify_credential(ctx)
    }

    pub fn initialize_hub(ctx: Context<InitializeHub>) -> Result<()> {
        handlers::hub::initialize_hub(ctx)
    }

    pub fn update_hub_config(
        ctx: Context<UpdateHubConfig>,
        config: HubConfig,
    ) -> Result<()> {
        handlers::hub::update_hub_config(ctx, config)
    }

    pub fn add_accepted_provider(ctx: Context<AddAcceptedProvider>) -> Result<()> {
        handlers::hub::add_accepted_provider(ctx)
    }

    pub fn remove_accepted_provider(ctx: Context<RemoveAcceptedProvider>) -> Result<()> {
        handlers::hub::remove_accepted_provider(ctx)
    }

    pub fn add_accepted_endorser(ctx: Context<AddAcceptedEndorser>) -> Result<()> {
        handlers::hub::add_accepted_endorser(ctx)
    }

    pub fn remove_accepted_endorser(ctx: Context<RemoveAcceptedEndorser>) -> Result<()> {
        handlers::hub::remove_accepted_endorser(ctx)
    }

    pub fn transfer_hub_authority(ctx: Context<TransferHubAuthority>) -> Result<()> {
        handlers::hub::transfer_hub_authority(ctx)
    }

    pub fn add_accepted_course(
        ctx: Context<AddAcceptedCourse>,
        course_id: String,
    ) -> Result<()> {
        handlers::hub::add_accepted_course(ctx, course_id)
    }

    pub fn remove_accepted_course(
        ctx: Context<RemoveAcceptedCourse>,
        course_id: String,
    ) -> Result<()> {
        handlers::hub::remove_accepted_course(ctx, course_id)
    }

    pub fn create_course(
        ctx: Context<CreateCourse>,
        course_id: String,
        name: String,
        description: String,
        workload_required: u32,
        degree_id: Option<String>,
    ) -> Result<()> {
        handlers::course::create_course(ctx, course_id, name, description, workload_required, degree_id)
    }

    pub fn create_weight(
        ctx: Context<CreateWeight>,
        weight_id: String,
        name: String,
        percentage: u8,
        description: Option<String>,
    ) -> Result<()> {
        handlers::course::create_weight(ctx, weight_id, name, percentage, description)
    }

    pub fn update_course_status(
        ctx: Context<UpdateCourseStatus>,
        status: types::CourseStatus,
        rejection_reason: Option<String>,
    ) -> Result<()> {
        handlers::course::update_course_status(ctx, status, rejection_reason)
    }

    pub fn archive_course_progress(
        ctx: Context<ArchiveCourseProgress>,
    ) -> Result<bool> {
        handlers::course::archive_course_progress(ctx)
    }

    pub fn update_course_progress(
        ctx: Context<UpdateCourseProgress>,
        progress: u8,
    ) -> Result<()> {
        handlers::course::update_course_progress(ctx, progress)
    }

    pub fn complete_course(
        ctx: Context<CompleteCourse>,
        final_grade: f64,
    ) -> Result<()> {
        handlers::course::complete_course(ctx, final_grade)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
