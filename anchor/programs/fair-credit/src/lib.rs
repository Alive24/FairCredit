use anchor_lang::prelude::*;

pub mod events;
pub mod handlers;
pub mod state;
pub mod types;

// Use specific imports instead of wildcards
use handlers::course::*;
use handlers::credential::*;
use handlers::hub::*;
use handlers::provider::*;
use handlers::resource::*;
use state::HubConfig;

// Must match target/deploy/fair_credit-keypair.json (run: solana address -k anchor/target/deploy/fair_credit-keypair.json)
declare_id!("95asCfd7nbJN5i6REuiuLHj7Wb6DqqAKrhG1tRJ7Dthx");

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
        handlers::provider::initialize_provider(
            ctx,
            name,
            description,
            website,
            email,
            provider_type,
        )
    }

    pub fn create_credential(ctx: Context<CreateCredential>) -> Result<()> {
        handlers::credential::create_credential(ctx)
    }

    pub fn link_activity_to_credential(ctx: Context<LinkActivityToCredential>) -> Result<()> {
        handlers::credential::link_activity_to_credential(ctx)
    }

    pub fn endorse_credential(
        ctx: Context<EndorseCredential>,
        endorsement_message: String,
    ) -> Result<()> {
        handlers::credential::endorse_credential(ctx, endorsement_message)
    }

    pub fn approve_credential(ctx: Context<ApproveCredential>) -> Result<()> {
        handlers::credential::approve_credential(ctx)
    }

    pub fn mint_credential_nft(ctx: Context<MintCredentialNft>) -> Result<()> {
        handlers::credential::mint_credential_nft(ctx)
    }

    pub fn initialize_hub(ctx: Context<InitializeHub>) -> Result<()> {
        handlers::hub::initialize_hub(ctx)
    }

    pub fn close_hub(ctx: Context<CloseHub>) -> Result<()> {
        handlers::hub::close_hub(ctx)
    }

    pub fn update_hub_config(ctx: Context<UpdateHubConfig>, config: HubConfig) -> Result<()> {
        handlers::hub::update_hub_config(ctx, config)
    }

    pub fn add_accepted_provider(ctx: Context<AddAcceptedProvider>) -> Result<()> {
        handlers::hub::add_accepted_provider(ctx)
    }

    pub fn remove_accepted_provider(ctx: Context<RemoveAcceptedProvider>) -> Result<()> {
        handlers::hub::remove_accepted_provider(ctx)
    }

    pub fn transfer_hub_authority(ctx: Context<TransferHubAuthority>) -> Result<()> {
        handlers::hub::transfer_hub_authority(ctx)
    }

    pub fn add_accepted_course(ctx: Context<AddAcceptedCourse>) -> Result<()> {
        handlers::hub::add_accepted_course(ctx)
    }

    pub fn remove_accepted_course(ctx: Context<RemoveAcceptedCourse>) -> Result<()> {
        handlers::hub::remove_accepted_course(ctx)
    }

    pub fn create_course_list(
        ctx: Context<CreateCourseList>,
        course_list_index: u16,
    ) -> Result<()> {
        handlers::hub::create_course_list(ctx, course_list_index)
    }

    pub fn add_course_to_list(ctx: Context<AddCourseToList>, course_list_index: u16) -> Result<()> {
        handlers::hub::add_course_to_list(ctx, course_list_index)
    }

    pub fn remove_course_from_list(
        ctx: Context<RemoveCourseFromList>,
        course_list_index: u16,
        remove_reference_if_empty: bool,
    ) -> Result<()> {
        handlers::hub::remove_course_from_list(ctx, course_list_index, remove_reference_if_empty)
    }

    pub fn set_course_list_next(
        ctx: Context<SetCourseListNext>,
        course_list_index: u16,
    ) -> Result<()> {
        handlers::hub::set_course_list_next(ctx, course_list_index)
    }

    pub fn add_provider_endorser(ctx: Context<AddProviderEndorser>) -> Result<()> {
        handlers::provider::add_provider_endorser(ctx)
    }

    pub fn remove_provider_endorser(ctx: Context<RemoveProviderEndorser>) -> Result<()> {
        handlers::provider::remove_provider_endorser(ctx)
    }

    pub fn close_provider(ctx: Context<CloseProvider>) -> Result<()> {
        handlers::provider::close_provider(ctx)
    }

    pub fn create_course(
        ctx: Context<CreateCourse>,
        creation_timestamp: i64,
        name: String,
        description: String,
        workload_required: u32,
        degree_id: Option<String>,
    ) -> Result<()> {
        handlers::course::create_course(
            ctx,
            creation_timestamp,
            name,
            description,
            workload_required,
            degree_id,
        )
    }

    pub fn add_course_module(
        ctx: Context<AddCourseModule>,
        resource: Pubkey,
        percentage: u8,
    ) -> Result<()> {
        handlers::course::add_course_module(ctx, resource, percentage)
    }

    pub fn update_course_status(
        ctx: Context<UpdateCourseStatus>,
        status: types::CourseStatus,
        rejection_reason: Option<String>,
    ) -> Result<()> {
        handlers::course::update_course_status(ctx, status, rejection_reason)
    }

    pub fn set_course_nostr_ref(
        ctx: Context<SetCourseNostrRef>,
        nostr_d_tag: String,
        nostr_author_pubkey: [u8; 32],
        force: bool,
    ) -> Result<()> {
        handlers::course::set_course_nostr_ref(ctx, nostr_d_tag, nostr_author_pubkey, force)
    }

    pub fn close_course(ctx: Context<CloseCourse>) -> Result<()> {
        handlers::course::close_course(ctx)
    }

    pub fn add_resource(
        ctx: Context<AddResource>,
        creation_timestamp: i64,
        kind: types::ResourceKind,
        name: String,
        external_id: Option<String>,
        workload: Option<u32>,
        tags: Vec<String>,
    ) -> Result<()> {
        handlers::resource::add_resource(
            ctx,
            creation_timestamp,
            kind,
            name,
            external_id,
            workload,
            tags,
        )
    }

    pub fn update_resource_data(
        ctx: Context<UpdateResourceData>,
        name: Option<String>,
        workload: Option<u32>,
        tags: Option<Vec<String>>,
    ) -> Result<()> {
        handlers::resource::update_resource_data(ctx, name, workload, tags)
    }

    pub fn set_resource_nostr_ref(
        ctx: Context<SetResourceNostrRef>,
        nostr_d_tag: String,
        nostr_author_pubkey: [u8; 32],
        force: bool,
    ) -> Result<()> {
        handlers::resource::set_resource_nostr_ref(ctx, nostr_d_tag, nostr_author_pubkey, force)
    }

    pub fn set_resource_walrus_ref(
        ctx: Context<SetResourceWalrusRef>,
        walrus_blob_id: String,
    ) -> Result<()> {
        handlers::resource::set_resource_walrus_ref(ctx, walrus_blob_id)
    }

    pub fn create_asset(
        ctx: Context<CreateAsset>,
        creation_timestamp: i64,
        content_type: Option<String>,
        file_name: Option<String>,
        file_size: Option<u64>,
        resource: Option<Pubkey>,
    ) -> Result<()> {
        handlers::resource::create_asset(
            ctx,
            creation_timestamp,
            content_type,
            file_name,
            file_size,
            resource,
        )
    }

    pub fn set_asset_nostr_ref(
        ctx: Context<SetAssetNostrRef>,
        nostr_d_tag: String,
        nostr_author_pubkey: [u8; 32],
        force: bool,
    ) -> Result<()> {
        handlers::resource::set_asset_nostr_ref(ctx, nostr_d_tag, nostr_author_pubkey, force)
    }

    pub fn set_asset_walrus_ref(
        ctx: Context<SetAssetWalrusRef>,
        walrus_blob_id: String,
    ) -> Result<()> {
        handlers::resource::set_asset_walrus_ref(ctx, walrus_blob_id)
    }

    pub fn create_submission(
        ctx: Context<CreateSubmission>,
        submission_timestamp: i64,
        assets: Vec<Pubkey>,
        evidence_assets: Vec<Pubkey>,
    ) -> Result<()> {
        handlers::resource::create_submission(ctx, submission_timestamp, assets, evidence_assets)
    }

    pub fn grade_submission(
        ctx: Context<GradeSubmission>,
        grade: f64,
        feedback: Option<String>,
    ) -> Result<()> {
        handlers::resource::grade_submission(ctx, grade, feedback)
    }

    pub fn set_submission_nostr_ref(
        ctx: Context<SetSubmissionNostrRef>,
        nostr_d_tag: String,
        nostr_author_pubkey: [u8; 32],
        force: bool,
    ) -> Result<()> {
        handlers::resource::set_submission_nostr_ref(ctx, nostr_d_tag, nostr_author_pubkey, force)
    }

    pub fn set_submission_walrus_ref(
        ctx: Context<SetSubmissionWalrusRef>,
        walrus_blob_id: String,
    ) -> Result<()> {
        handlers::resource::set_submission_walrus_ref(ctx, walrus_blob_id)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
