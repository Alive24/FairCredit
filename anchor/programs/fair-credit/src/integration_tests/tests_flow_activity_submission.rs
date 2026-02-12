#![cfg(test)]

use {
    anchor_lang::{prelude::Pubkey, AccountDeserialize, AnchorSerialize, Space},
    mollusk_svm::{program::loader_keys, result::Check, Mollusk},
    solana_sdk::{
        account::Account,
        instruction::{AccountMeta, Instruction},
    },
    solana_system_interface::program as system_program,
    std::{collections::HashMap, path::PathBuf},
};

use crate::ID as PROGRAM_ID;

#[test]
fn flow_resource_hybrid_storage() {
    use crate::state::{Asset, Resource};
    use crate::types::ResourceKind;

    let now: i64 = 1_700_000_000;
    let (ctx, keys) = setup_hub_provider_course(now, now);

    // Resource PDA
    let resource_created = now;
    let (resource_pda, _bump) = Pubkey::find_program_address(
        &[
            b"resource",
            keys.course_pda.as_ref(),
            &resource_created.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    precreate_pda(&ctx, resource_pda);

    // add_resource
    #[derive(AnchorSerialize)]
    struct AddResourceArgs {
        creation_timestamp: i64,
        kind: ResourceKind,
        name: String,
        external_id: Option<String>,
        workload: Option<u32>,
        tags: Vec<String>,
        nostr_d_tag: Option<String>,
        nostr_author_pubkey: Option<[u8; 32]>,
    }
    let ix_add_resource = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "add_resource",
            &AddResourceArgs {
                creation_timestamp: resource_created,
                kind: ResourceKind::General,
                name: "Hybrid Assignment".to_string(),
                external_id: None,
                workload: None,
                tags: vec!["hybrid".to_string(), "nostr".to_string()],
                nostr_d_tag: None,
                nostr_author_pubkey: None,
            },
        ),
        vec![
            AccountMeta::new(resource_pda, false),
            AccountMeta::new_readonly(keys.course_pda, false),
            AccountMeta::new_readonly(keys.provider_pda, false),
            AccountMeta::new_readonly(keys.hub_pda, false),
            AccountMeta::new(keys.provider_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // set_resource_nostr_ref
    #[derive(AnchorSerialize)]
    struct SetResourceNostrRefArgs {
        nostr_d_tag: String,
        nostr_author_pubkey: [u8; 32],
        force: bool,
    }
    let ix_set_resource_nostr = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "set_resource_nostr_ref",
            &SetResourceNostrRefArgs {
                nostr_d_tag: "faircredit:resource:nostr-test".to_string(),
                nostr_author_pubkey: [7u8; 32],
                force: true,
            },
        ),
        vec![
            AccountMeta::new(resource_pda, false),
            AccountMeta::new(keys.provider_authority, true),
        ],
    );

    // set_resource_walrus_ref
    #[derive(AnchorSerialize)]
    struct SetResourceWalrusRefArgs {
        walrus_blob_id: String,
    }
    let ix_set_resource_walrus = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "set_resource_walrus_ref",
            &SetResourceWalrusRefArgs {
                walrus_blob_id: "walrus-blob-123".to_string(),
            },
        ),
        vec![
            AccountMeta::new(resource_pda, false),
            AccountMeta::new(keys.provider_authority, true),
        ],
    );

    // Asset PDA
    let asset_created = now + 1;
    let (asset_pda, _abump) = Pubkey::find_program_address(
        &[
            b"asset",
            keys.provider_authority.as_ref(),
            &asset_created.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    precreate_pda(&ctx, asset_pda);

    // create_asset
    #[derive(AnchorSerialize)]
    struct CreateAssetArgs {
        creation_timestamp: i64,
        content_type: Option<String>,
        file_name: Option<String>,
        file_size: Option<u64>,
        resource: Option<Pubkey>,
    }
    let ix_create_asset = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "create_asset",
            &CreateAssetArgs {
                creation_timestamp: asset_created,
                content_type: Some("application/pdf".to_string()),
                file_name: Some("hybrid.pdf".to_string()),
                file_size: Some(1024),
                resource: Some(resource_pda),
            },
        ),
        vec![
            AccountMeta::new(asset_pda, false),
            AccountMeta::new(keys.provider_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // set_asset_nostr_ref
    #[derive(AnchorSerialize)]
    struct SetAssetNostrRefArgs {
        nostr_d_tag: String,
        nostr_author_pubkey: [u8; 32],
        force: bool,
    }
    let ix_set_asset_nostr = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "set_asset_nostr_ref",
            &SetAssetNostrRefArgs {
                nostr_d_tag: "faircredit:asset:nostr".to_string(),
                nostr_author_pubkey: [9u8; 32],
                force: true,
            },
        ),
        vec![
            AccountMeta::new(asset_pda, false),
            AccountMeta::new(keys.provider_authority, true),
        ],
    );

    // set_asset_walrus_ref
    #[derive(AnchorSerialize)]
    struct SetAssetWalrusRefArgs {
        walrus_blob_id: String,
    }
    let ix_set_asset_walrus = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "set_asset_walrus_ref",
            &SetAssetWalrusRefArgs {
                walrus_blob_id: "asset-blob-456".to_string(),
            },
        ),
        vec![
            AccountMeta::new(asset_pda, false),
            AccountMeta::new(keys.provider_authority, true),
        ],
    );

    ctx.process_and_validate_instruction_chain(&[
        (&ix_add_resource, &[Check::success()]),
        (&ix_set_resource_nostr, &[Check::success()]),
        (&ix_set_resource_walrus, &[Check::success()]),
        (&ix_create_asset, &[Check::success()]),
        (&ix_set_asset_nostr, &[Check::success()]),
        (&ix_set_asset_walrus, &[Check::success()]),
    ]);

    // Validate on-chain state via deserialization.
    let store_ref = ctx.account_store.borrow();

    let resource_account = store_ref.get(&resource_pda).expect("resource account");
    let mut resource_data: &[u8] = resource_account.data.as_slice();
    let resource_state =
        Resource::try_deserialize(&mut resource_data).expect("resource deserialize");
    assert_eq!(resource_state.kind, ResourceKind::General);
    assert_eq!(resource_state.name, "Hybrid Assignment");
    assert_eq!(
        resource_state.nostr_d_tag.as_deref(),
        Some("faircredit:resource:nostr-test")
    );
    assert_eq!(
        resource_state.walrus_blob_id.as_deref(),
        Some("walrus-blob-123")
    );

    let asset_account = store_ref.get(&asset_pda).expect("asset account");
    let mut asset_data: &[u8] = asset_account.data.as_slice();
    let asset_state = Asset::try_deserialize(&mut asset_data).expect("asset deserialize");
    assert_eq!(asset_state.resource, resource_pda);
    assert_eq!(
        asset_state.nostr_d_tag.as_deref(),
        Some("faircredit:asset:nostr")
    );
    assert_eq!(
        asset_state.walrus_blob_id.as_deref(),
        Some("asset-blob-456")
    );
}

#[test]
fn flow_activity_management() {
    use crate::state::Activity;
    use crate::types::{ActivityKind, ActivityStatus};

    let now: i64 = 1_700_000_000;
    let (ctx, keys) = setup_hub_provider_course(now, now);

    // Activity PDA
    let activity_created = now;
    let (activity_pda, _bump) = Pubkey::find_program_address(
        &[
            b"activity",
            keys.provider_pda.as_ref(),
            keys.student.as_ref(),
            &activity_created.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    precreate_pda(&ctx, activity_pda);

    // create_activity
    #[derive(AnchorSerialize)]
    struct CreateActivityArgs {
        creation_timestamp: i64,
        kind: ActivityKind,
        data: String,
        degree_id: Option<String>,
        course: Option<Pubkey>,
        resource_id: Option<String>,
        resource_kind: Option<crate::types::ResourceKind>,
    }
    let ix_create_activity = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "create_activity",
            &CreateActivityArgs {
                creation_timestamp: activity_created,
                kind: ActivityKind::AttendMeeting,
                data: "Attended weekly sync".to_string(),
                degree_id: None,
                course: Some(keys.course_pda),
                resource_id: None,
                resource_kind: None,
            },
        ),
        vec![
            AccountMeta::new(activity_pda, false),
            AccountMeta::new(keys.student, true),
            AccountMeta::new_readonly(keys.provider_pda, false),
            AccountMeta::new_readonly(keys.hub_pda, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // add_attendance
    #[derive(AnchorSerialize)]
    struct AddAttendanceArgs {
        timestamp: Option<String>,
    }
    let attendance_ts = "2024-01-01T00:00:00Z".to_string();
    let ix_add_attendance = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "add_attendance",
            &AddAttendanceArgs {
                timestamp: Some(attendance_ts.clone()),
            },
        ),
        vec![
            AccountMeta::new(activity_pda, false),
            AccountMeta::new(keys.student, true),
        ],
    );

    // add_feedback
    #[derive(AnchorSerialize)]
    struct AddFeedbackArgs {
        content: String,
        asset_ids: Vec<String>,
        evidence_asset_ids: Vec<String>,
    }
    let ix_add_feedback = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "add_feedback",
            &AddFeedbackArgs {
                content: "Great session!".to_string(),
                asset_ids: vec!["asset1".to_string(), "asset2".to_string()],
                evidence_asset_ids: vec!["evidence1".to_string()],
            },
        ),
        vec![
            AccountMeta::new(activity_pda, false),
            AccountMeta::new(keys.student, true),
        ],
    );

    // add_grade (teacher can be any signer per current constraints)
    #[derive(AnchorSerialize)]
    struct AddGradeArgs {
        grade_value: f64,
        asset_ids: Vec<String>,
        evidence_asset_ids: Vec<String>,
    }
    let ix_add_grade = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "add_grade",
            &AddGradeArgs {
                grade_value: 95.5,
                asset_ids: vec![],
                evidence_asset_ids: vec![],
            },
        ),
        vec![
            AccountMeta::new(activity_pda, false),
            AccountMeta::new(keys.provider_authority, true),
        ],
    );

    // archive_activity
    let ix_archive_activity = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("archive_activity"),
        vec![
            AccountMeta::new(activity_pda, false),
            AccountMeta::new(keys.student, true),
        ],
    );

    ctx.process_and_validate_instruction_chain(&[
        (&ix_create_activity, &[Check::success()]),
        (&ix_add_attendance, &[Check::success()]),
        (&ix_add_feedback, &[Check::success()]),
        (&ix_add_grade, &[Check::success()]),
        (&ix_archive_activity, &[Check::success()]),
    ]);

    let store_ref = ctx.account_store.borrow();
    let activity_account = store_ref.get(&activity_pda).expect("activity account");
    let mut activity_data: &[u8] = activity_account.data.as_slice();
    let activity_state =
        Activity::try_deserialize(&mut activity_data).expect("activity deserialize");
    assert_eq!(activity_state.kind, ActivityKind::AttendMeeting);
    assert_eq!(activity_state.status, ActivityStatus::Archived);
    assert_eq!(activity_state.grade, Some(95.5));
}

#[test]
fn flow_submission_management() {
    use crate::state::{Resource, Submission};
    use crate::types::{ResourceKind, SubmissionStatus};

    let now: i64 = 1_700_000_000;
    let (ctx, keys) = setup_hub_provider_course(now, now);

    // Resource PDA (assignment)
    let resource_created = now;
    let (resource_pda, _bump) = Pubkey::find_program_address(
        &[
            b"resource",
            keys.course_pda.as_ref(),
            &resource_created.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    precreate_pda(&ctx, resource_pda);

    #[derive(AnchorSerialize)]
    struct AddResourceArgs {
        creation_timestamp: i64,
        kind: ResourceKind,
        name: String,
        external_id: Option<String>,
        workload: Option<u32>,
        tags: Vec<String>,
        nostr_d_tag: Option<String>,
        nostr_author_pubkey: Option<[u8; 32]>,
    }
    let ix_add_resource = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "add_resource",
            &AddResourceArgs {
                creation_timestamp: resource_created,
                kind: ResourceKind::Assignment,
                name: "Final Project".to_string(),
                external_id: None,
                workload: Some(5),
                tags: vec!["project".to_string()],
                nostr_d_tag: None,
                nostr_author_pubkey: None,
            },
        ),
        vec![
            AccountMeta::new(resource_pda, false),
            AccountMeta::new_readonly(keys.course_pda, false),
            AccountMeta::new_readonly(keys.provider_pda, false),
            AccountMeta::new_readonly(keys.hub_pda, false),
            AccountMeta::new(keys.provider_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // Submission PDA
    let submitted_at = now + 2;
    let (submission_pda, _sbump) = Pubkey::find_program_address(
        &[
            b"submission",
            resource_pda.as_ref(),
            keys.student.as_ref(),
            &submitted_at.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    precreate_pda(&ctx, submission_pda);

    #[derive(AnchorSerialize)]
    struct CreateSubmissionArgs {
        submission_timestamp: i64,
        assets: Vec<Pubkey>,
        evidence_assets: Vec<Pubkey>,
    }
    let ix_create_submission = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "create_submission",
            &CreateSubmissionArgs {
                submission_timestamp: submitted_at,
                assets: vec![],
                evidence_assets: vec![],
            },
        ),
        vec![
            AccountMeta::new(submission_pda, false),
            AccountMeta::new_readonly(resource_pda, false),
            AccountMeta::new(keys.student, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // set_submission_nostr_ref
    #[derive(AnchorSerialize)]
    struct SetSubmissionNostrRefArgs {
        nostr_d_tag: String,
        nostr_author_pubkey: [u8; 32],
        force: bool,
    }
    let ix_set_submission_nostr = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "set_submission_nostr_ref",
            &SetSubmissionNostrRefArgs {
                nostr_d_tag: "my-submission-v1".to_string(),
                nostr_author_pubkey: [1u8; 32],
                force: false,
            },
        ),
        vec![
            AccountMeta::new(submission_pda, false),
            AccountMeta::new(keys.student, true),
        ],
    );

    // set_submission_walrus_ref
    #[derive(AnchorSerialize)]
    struct SetSubmissionWalrusRefArgs {
        walrus_blob_id: String,
    }
    let ix_set_submission_walrus = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "set_submission_walrus_ref",
            &SetSubmissionWalrusRefArgs {
                walrus_blob_id: "blob-xyz-123".to_string(),
            },
        ),
        vec![
            AccountMeta::new(submission_pda, false),
            AccountMeta::new(keys.student, true),
        ],
    );

    // grade_submission
    #[derive(AnchorSerialize)]
    struct GradeSubmissionArgs {
        grade: f64,
        feedback: Option<String>,
    }
    let ix_grade_submission = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "grade_submission",
            &GradeSubmissionArgs {
                grade: 88.0,
                feedback: Some("Great work on the project!".to_string()),
            },
        ),
        vec![
            AccountMeta::new(submission_pda, false),
            AccountMeta::new(keys.mentor, true),
        ],
    );

    ctx.process_and_validate_instruction_chain(&[
        (&ix_add_resource, &[Check::success()]),
        (&ix_create_submission, &[Check::success()]),
        (&ix_set_submission_nostr, &[Check::success()]),
        (&ix_set_submission_walrus, &[Check::success()]),
        (&ix_grade_submission, &[Check::success()]),
    ]);

    let store_ref = ctx.account_store.borrow();

    let resource_account = store_ref.get(&resource_pda).expect("resource account");
    let mut resource_data: &[u8] = resource_account.data.as_slice();
    let resource_state =
        Resource::try_deserialize(&mut resource_data).expect("resource deserialize");
    assert_eq!(resource_state.kind, ResourceKind::Assignment);

    let submission_account = store_ref.get(&submission_pda).expect("submission account");
    let mut submission_data: &[u8] = submission_account.data.as_slice();
    let submission_state =
        Submission::try_deserialize(&mut submission_data).expect("submission deserialize");
    assert_eq!(submission_state.status, SubmissionStatus::Graded);
    assert_eq!(submission_state.grade, Some(88.0));
    assert_eq!(
        submission_state.nostr_d_tag.as_deref(),
        Some("my-submission-v1")
    );
    assert_eq!(
        submission_state.walrus_blob_id.as_deref(),
        Some("blob-xyz-123")
    );
}

#[test]
fn flow_credential_lifecycle() {
    use crate::state::{Course, Credential};
    use crate::types::{ActivityKind, CourseStatus, CredentialStatus};

    let now: i64 = 1_700_000_000;
    let (ctx, keys) = setup_hub_provider_course(now, now);

    let ix_add_accepted_course = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("add_accepted_course"),
        vec![
            AccountMeta::new(keys.hub_pda, false),
            AccountMeta::new(keys.hub_authority, true),
            AccountMeta::new(keys.course_pda, false),
        ],
    );

    let activity_created = now + 1;
    let (activity_pda, _activity_bump) = Pubkey::find_program_address(
        &[
            b"activity",
            keys.provider_pda.as_ref(),
            keys.student.as_ref(),
            &activity_created.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    precreate_pda(&ctx, activity_pda);

    #[derive(AnchorSerialize)]
    struct CreateActivityArgs {
        creation_timestamp: i64,
        kind: ActivityKind,
        data: String,
        degree_id: Option<String>,
        course: Option<Pubkey>,
        resource_id: Option<String>,
        resource_kind: Option<crate::types::ResourceKind>,
    }
    let ix_create_activity = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "create_activity",
            &CreateActivityArgs {
                creation_timestamp: activity_created,
                kind: ActivityKind::AttendMeeting,
                data: "Credential-linked activity".to_string(),
                degree_id: None,
                course: Some(keys.course_pda),
                resource_id: None,
                resource_kind: None,
            },
        ),
        vec![
            AccountMeta::new(activity_pda, false),
            AccountMeta::new(keys.student, true),
            AccountMeta::new_readonly(keys.provider_pda, false),
            AccountMeta::new_readonly(keys.hub_pda, false),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    let (credential_pda, _credential_bump) = Pubkey::find_program_address(
        &[
            b"credential",
            keys.course_pda.as_ref(),
            keys.student.as_ref(),
        ],
        &PROGRAM_ID,
    );
    precreate_pda(&ctx, credential_pda);

    let ix_create_credential = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("create_credential"),
        vec![
            AccountMeta::new(credential_pda, false),
            AccountMeta::new_readonly(keys.course_pda, false),
            AccountMeta::new_readonly(keys.provider_pda, false),
            AccountMeta::new_readonly(keys.hub_pda, false),
            AccountMeta::new(keys.student, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    let ix_link_activity = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("link_activity_to_credential"),
        vec![
            AccountMeta::new(credential_pda, false),
            AccountMeta::new_readonly(activity_pda, false),
            AccountMeta::new(keys.student, true),
        ],
    );

    #[derive(AnchorSerialize)]
    struct EndorseCredentialArgs {
        endorsement_message: String,
    }
    let ix_endorse_credential = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "endorse_credential",
            &EndorseCredentialArgs {
                endorsement_message: "Strong independent work".to_string(),
            },
        ),
        vec![
            AccountMeta::new(credential_pda, false),
            AccountMeta::new(keys.mentor, true),
        ],
    );

    let ix_approve_credential = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("approve_credential"),
        vec![
            AccountMeta::new(credential_pda, false),
            AccountMeta::new(keys.course_pda, false),
            AccountMeta::new_readonly(keys.provider_pda, false),
            AccountMeta::new_readonly(keys.hub_pda, false),
            AccountMeta::new(keys.provider_authority, true),
        ],
    );

    ctx.process_and_validate_instruction_chain(&[
        (&ix_add_accepted_course, &[Check::success()]),
        (&ix_create_activity, &[Check::success()]),
        (&ix_create_credential, &[Check::success()]),
        (&ix_link_activity, &[Check::success()]),
        (&ix_endorse_credential, &[Check::success()]),
        (&ix_approve_credential, &[Check::success()]),
    ]);

    let store_ref = ctx.account_store.borrow();

    let course_account = store_ref.get(&keys.course_pda).expect("course account");
    let mut course_data: &[u8] = course_account.data.as_slice();
    let course_state = Course::try_deserialize(&mut course_data).expect("course deserialize");
    assert_eq!(course_state.status, CourseStatus::Accepted);
    assert!(course_state.approved_credentials.contains(&credential_pda));

    let credential_account = store_ref.get(&credential_pda).expect("credential account");
    let mut credential_data: &[u8] = credential_account.data.as_slice();
    let credential_state =
        Credential::try_deserialize(&mut credential_data).expect("credential deserialize");
    assert!(credential_state.status == CredentialStatus::Verified);
    assert_eq!(credential_state.course, keys.course_pda);
    assert_eq!(credential_state.student_wallet, keys.student);
    assert_eq!(credential_state.mentor_wallet, keys.mentor);
    assert!(credential_state.metadata.activities.contains(&activity_pda));
}

#[derive(Clone, Copy)]
struct SetupKeys {
    hub_authority: Pubkey,
    provider_authority: Pubkey,
    provider_pda: Pubkey,
    hub_pda: Pubkey,
    course_pda: Pubkey,
    student: Pubkey,
    mentor: Pubkey,
}

fn setup_hub_provider_course(
    now: i64,
    course_creation_timestamp: i64,
) -> (
    mollusk_svm::MolluskContext<HashMap<Pubkey, Account>>,
    SetupKeys,
) {
    use crate::state::{Course, Hub, Provider};

    let hub_authority = Pubkey::new_unique();
    let provider_authority = Pubkey::new_unique();
    let student = Pubkey::new_unique();
    let mentor = Pubkey::new_unique();

    let (hub_pda, _hub_bump) = Pubkey::find_program_address(&[b"hub"], &PROGRAM_ID);
    let (provider_pda, _provider_bump) = Pubkey::find_program_address(
        &[b"provider", hub_pda.as_ref(), provider_authority.as_ref()],
        &PROGRAM_ID,
    );
    let (course_pda, _course_bump) = Pubkey::find_program_address(
        &[
            b"course",
            hub_pda.as_ref(),
            provider_pda.as_ref(),
            &course_creation_timestamp.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );

    let mollusk = mollusk_with_program(now);

    let mut store: HashMap<Pubkey, Account> = HashMap::new();
    // Signers
    store.insert(
        hub_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(
        provider_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(
        student,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(
        mentor,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );

    // Uninitialized PDAs
    store.insert(hub_pda, Account::new(0, 0, &system_program::id()));
    store.insert(provider_pda, Account::new(0, 0, &system_program::id()));
    store.insert(course_pda, Account::new(0, 0, &system_program::id()));

    let ctx = mollusk.with_context(store);

    // initialize_hub
    let ix_initialize_hub = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("initialize_hub"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // initialize_provider
    #[derive(AnchorSerialize)]
    struct InitializeProviderArgs {
        name: String,
        description: String,
        website: String,
        email: String,
        provider_type: String,
    }
    let ix_initialize_provider = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "initialize_provider",
            &InitializeProviderArgs {
                name: "Test Provider".to_string(),
                description: "desc".to_string(),
                website: "https://example.com".to_string(),
                email: "test@example.com".to_string(),
                provider_type: "education".to_string(),
            },
        ),
        vec![
            AccountMeta::new(provider_pda, false),
            AccountMeta::new_readonly(hub_pda, false),
            AccountMeta::new(provider_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // add_accepted_provider
    let ix_add_accepted_provider = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("add_accepted_provider"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(provider_pda, false),
            AccountMeta::new_readonly(provider_authority, false),
        ],
    );

    // create_course
    #[derive(AnchorSerialize)]
    struct CreateCourseArgs {
        creation_timestamp: i64,
        name: String,
        description: String,
        workload_required: u32,
        degree_id: Option<String>,
        nostr_d_tag: Option<String>,
        nostr_author_pubkey: Option<[u8; 32]>,
    }
    let ix_create_course = Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "create_course",
            &CreateCourseArgs {
                creation_timestamp: course_creation_timestamp,
                name: "Course 101".to_string(),
                description: "Intro".to_string(),
                workload_required: 10,
                degree_id: None,
                nostr_d_tag: None,
                nostr_author_pubkey: None,
            },
        ),
        vec![
            AccountMeta::new(course_pda, false),
            AccountMeta::new(provider_pda, false),
            AccountMeta::new_readonly(hub_pda, false),
            AccountMeta::new(provider_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    ctx.process_and_validate_instruction_chain(&[
        (
            &ix_initialize_hub,
            &[
                Check::success(),
                Check::account(&hub_pda)
                    .owner(&PROGRAM_ID)
                    .space(8 + Hub::INIT_SPACE)
                    .rent_exempt()
                    .build(),
            ],
        ),
        (
            &ix_initialize_provider,
            &[
                Check::success(),
                Check::account(&provider_pda)
                    .owner(&PROGRAM_ID)
                    .space(8 + Provider::INIT_SPACE)
                    .rent_exempt()
                    .build(),
            ],
        ),
        (&ix_add_accepted_provider, &[Check::success()]),
        (
            &ix_create_course,
            &[
                Check::success(),
                Check::account(&course_pda)
                    .owner(&PROGRAM_ID)
                    .space(8 + Course::INIT_SPACE)
                    .rent_exempt()
                    .build(),
            ],
        ),
    ]);

    (
        ctx,
        SetupKeys {
            hub_authority,
            provider_authority,
            provider_pda,
            hub_pda,
            course_pda,
            student,
            mentor,
        },
    )
}

fn precreate_pda(ctx: &mollusk_svm::MolluskContext<HashMap<Pubkey, Account>>, pubkey: Pubkey) {
    let mut store = ctx.account_store.borrow_mut();
    store.insert(pubkey, Account::new(0, 0, &system_program::id()));
}

fn mollusk_with_program(now: i64) -> Mollusk {
    let elf = load_fair_credit_elf();
    let mut mollusk = Mollusk::default();
    mollusk.sysvars.clock.unix_timestamp = now;
    mollusk.add_program_with_elf_and_loader(&PROGRAM_ID, &elf, &loader_keys::LOADER_V3);
    mollusk
}

fn load_fair_credit_elf() -> Vec<u8> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR")); // anchor/programs/fair-credit
    let anchor_dir = manifest_dir
        .parent()
        .and_then(|p| p.parent())
        .expect("anchor dir");
    let candidates = [
        anchor_dir.join("target/deploy/fair_credit.so"),
        PathBuf::from("fair_credit.so"),
    ];
    for path in candidates {
        if path.exists() {
            return std::fs::read(&path).unwrap_or_else(|e| {
                panic!("Failed to read program ELF at {}: {}", path.display(), e)
            });
        }
    }
    panic!(
        "fair_credit.so not found. Expected at anchor/target/deploy/fair_credit.so after running `cargo build-sbf` or `anchor build`."
    );
}

fn anchor_ix_data_no_args(ix_name: &str) -> Vec<u8> {
    anchor_discriminator(ix_name).to_vec()
}

fn anchor_ix_data<T: AnchorSerialize>(ix_name: &str, args: &T) -> Vec<u8> {
    let mut data = Vec::with_capacity(8 + 64);
    data.extend_from_slice(&anchor_discriminator(ix_name));
    args.serialize(&mut data).expect("serialize args");
    data
}

fn anchor_discriminator(ix_name: &str) -> [u8; 8] {
    let preimage = format!("global:{ix_name}");
    let hash = solana_sdk::hash::hash(preimage.as_bytes()).to_bytes();
    hash[..8].try_into().expect("discriminator")
}
