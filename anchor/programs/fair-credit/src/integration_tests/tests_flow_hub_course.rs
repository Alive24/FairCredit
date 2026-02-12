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
fn flow_hub_provider_course() {
    use crate::state::{Course, Hub, Provider};
    use crate::types::CourseStatus;

    let now: i64 = 1_700_000_000;

    let hub_authority = Pubkey::new_unique();
    let provider_authority = Pubkey::new_unique();

    let (hub_pda, _hub_bump) = Pubkey::find_program_address(&[b"hub"], &PROGRAM_ID);
    let (provider_pda, _provider_bump) = Pubkey::find_program_address(
        &[b"provider", hub_pda.as_ref(), provider_authority.as_ref()],
        &PROGRAM_ID,
    );

    let course_creation_timestamp = now;
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
    store.insert(
        hub_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(
        provider_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(hub_pda, Account::new(0, 0, &system_program::id()));
    store.insert(provider_pda, Account::new(0, 0, &system_program::id()));
    store.insert(course_pda, Account::new(0, 0, &system_program::id()));

    let ctx = mollusk.with_context(store);

    let ix_initialize_hub = ix_initialize_hub(hub_pda, hub_authority);
    let ix_initialize_provider =
        ix_initialize_provider(hub_pda, provider_pda, provider_authority, "Test Provider");
    let ix_add_accepted_provider =
        ix_add_accepted_provider(hub_pda, hub_authority, provider_pda, provider_authority);
    let ix_create_course = ix_create_course(
        hub_pda,
        provider_pda,
        provider_authority,
        course_pda,
        course_creation_timestamp,
        "Course 101",
    );
    let ix_add_accepted_course = ix_add_accepted_course(hub_pda, hub_authority, course_pda);

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
        (&ix_add_accepted_course, &[Check::success()]),
    ]);

    let store_ref = ctx.account_store.borrow();

    let hub_account = store_ref.get(&hub_pda).expect("hub account");
    let mut hub_data: &[u8] = hub_account.data.as_slice();
    let hub_state = Hub::try_deserialize(&mut hub_data).expect("hub deserialize");
    assert!(hub_state.accepted_providers.contains(&provider_authority));
    assert!(hub_state.accepted_courses.contains(&course_pda));

    let provider_account = store_ref.get(&provider_pda).expect("provider account");
    let mut provider_data: &[u8] = provider_account.data.as_slice();
    let provider_state =
        Provider::try_deserialize(&mut provider_data).expect("provider deserialize");
    assert_eq!(provider_state.wallet, provider_authority);

    let course_account = store_ref.get(&course_pda).expect("course account");
    let mut course_data: &[u8] = course_account.data.as_slice();
    let course_state = Course::try_deserialize(&mut course_data).expect("course deserialize");
    assert_eq!(course_state.status, CourseStatus::Accepted);
}

#[test]
fn flow_hub_admin_and_provider_reinitialization_guards() {
    use crate::state::Hub;

    let now: i64 = 1_700_000_000;
    let hub_authority = Pubkey::new_unique();
    let provider_authority = Pubkey::new_unique();

    let (hub_pda, _hub_bump) = Pubkey::find_program_address(&[b"hub"], &PROGRAM_ID);
    let (provider_pda, _provider_bump) = Pubkey::find_program_address(
        &[b"provider", hub_pda.as_ref(), provider_authority.as_ref()],
        &PROGRAM_ID,
    );

    let mollusk = mollusk_with_program(now);
    let mut store: HashMap<Pubkey, Account> = HashMap::new();
    store.insert(
        hub_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(
        provider_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(hub_pda, Account::new(0, 0, &system_program::id()));
    store.insert(provider_pda, Account::new(0, 0, &system_program::id()));

    let ctx = mollusk.with_context(store);

    let ix_initialize_hub = ix_initialize_hub(hub_pda, hub_authority);
    let ix_initialize_provider =
        ix_initialize_provider(hub_pda, provider_pda, provider_authority, "Provider A");
    let ix_add_accepted_provider =
        ix_add_accepted_provider(hub_pda, hub_authority, provider_pda, provider_authority);
    let ix_update_hub_config = ix_update_hub_config(hub_pda, hub_authority, false, 80);
    let ix_remove_accepted_provider =
        ix_remove_accepted_provider(hub_pda, hub_authority, provider_authority);

    ctx.process_and_validate_instruction_chain(&[
        (&ix_initialize_hub, &[Check::success()]),
        (&ix_initialize_provider, &[Check::success()]),
        (&ix_add_accepted_provider, &[Check::success()]),
        (&ix_update_hub_config, &[Check::success()]),
        (&ix_remove_accepted_provider, &[Check::success()]),
    ]);

    let duplicate_provider_result = ctx.process_instruction(&ix_initialize_provider);
    assert!(duplicate_provider_result.program_result.is_err());

    let store_ref = ctx.account_store.borrow();
    let hub_account = store_ref.get(&hub_pda).expect("hub account");
    let mut hub_data: &[u8] = hub_account.data.as_slice();
    let hub_state = Hub::try_deserialize(&mut hub_data).expect("hub deserialize");

    assert!(hub_state.accepted_providers.is_empty());
    assert!(!hub_state.config.require_provider_approval);
    assert_eq!(hub_state.config.min_reputation_score, 80);
}

#[test]
fn flow_course_sharding_and_nonaccepted_provider_rejection() {
    use crate::state::{Course, CourseList, Hub};
    use crate::types::CourseStatus;

    let now: i64 = 1_700_000_000;
    let hub_authority = Pubkey::new_unique();
    let accepted_provider_authority = Pubkey::new_unique();
    let pending_provider_authority = Pubkey::new_unique();

    let (hub_pda, _hub_bump) = Pubkey::find_program_address(&[b"hub"], &PROGRAM_ID);
    let (accepted_provider_pda, _accepted_provider_bump) = Pubkey::find_program_address(
        &[
            b"provider",
            hub_pda.as_ref(),
            accepted_provider_authority.as_ref(),
        ],
        &PROGRAM_ID,
    );
    let (pending_provider_pda, _pending_provider_bump) = Pubkey::find_program_address(
        &[
            b"provider",
            hub_pda.as_ref(),
            pending_provider_authority.as_ref(),
        ],
        &PROGRAM_ID,
    );

    let accepted_course_created = now;
    let pending_course_created = now + 1;

    let (accepted_course_pda, _accepted_course_bump) = Pubkey::find_program_address(
        &[
            b"course",
            hub_pda.as_ref(),
            accepted_provider_pda.as_ref(),
            &accepted_course_created.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );
    let (pending_course_pda, _pending_course_bump) = Pubkey::find_program_address(
        &[
            b"course",
            hub_pda.as_ref(),
            pending_provider_pda.as_ref(),
            &pending_course_created.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );

    let course_list_index: u16 = 7;
    let (course_list_pda, _course_list_bump) = Pubkey::find_program_address(
        &[
            b"course-list",
            hub_pda.as_ref(),
            &course_list_index.to_le_bytes(),
        ],
        &PROGRAM_ID,
    );

    let mollusk = mollusk_with_program(now);
    let mut store: HashMap<Pubkey, Account> = HashMap::new();
    store.insert(
        hub_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(
        accepted_provider_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(
        pending_provider_authority,
        Account::new(10_000_000_000, 0, &system_program::id()),
    );
    store.insert(hub_pda, Account::new(0, 0, &system_program::id()));
    store.insert(
        accepted_provider_pda,
        Account::new(0, 0, &system_program::id()),
    );
    store.insert(
        pending_provider_pda,
        Account::new(0, 0, &system_program::id()),
    );
    store.insert(
        accepted_course_pda,
        Account::new(0, 0, &system_program::id()),
    );
    store.insert(
        pending_course_pda,
        Account::new(0, 0, &system_program::id()),
    );
    store.insert(course_list_pda, Account::new(0, 0, &system_program::id()));

    let ctx = mollusk.with_context(store);

    let ix_initialize_hub = ix_initialize_hub(hub_pda, hub_authority);
    let ix_init_accepted_provider = ix_initialize_provider(
        hub_pda,
        accepted_provider_pda,
        accepted_provider_authority,
        "Accepted Provider",
    );
    let ix_init_pending_provider = ix_initialize_provider(
        hub_pda,
        pending_provider_pda,
        pending_provider_authority,
        "Pending Provider",
    );
    let ix_add_accepted_provider = ix_add_accepted_provider(
        hub_pda,
        hub_authority,
        accepted_provider_pda,
        accepted_provider_authority,
    );
    let ix_create_accepted_course = ix_create_course(
        hub_pda,
        accepted_provider_pda,
        accepted_provider_authority,
        accepted_course_pda,
        accepted_course_created,
        "Accepted Course",
    );
    let ix_create_pending_course = ix_create_course(
        hub_pda,
        pending_provider_pda,
        pending_provider_authority,
        pending_course_pda,
        pending_course_created,
        "Pending Course",
    );

    ctx.process_and_validate_instruction_chain(&[
        (&ix_initialize_hub, &[Check::success()]),
        (&ix_init_accepted_provider, &[Check::success()]),
        (&ix_init_pending_provider, &[Check::success()]),
        (&ix_add_accepted_provider, &[Check::success()]),
        (&ix_create_accepted_course, &[Check::success()]),
        (&ix_create_pending_course, &[Check::success()]),
    ]);

    let ix_add_pending_course = ix_add_accepted_course(hub_pda, hub_authority, pending_course_pda);
    let pending_result = ctx.process_instruction(&ix_add_pending_course);
    assert!(pending_result.program_result.is_err());

    let ix_add_accepted_course =
        ix_add_accepted_course(hub_pda, hub_authority, accepted_course_pda);
    let ix_remove_accepted_course =
        ix_remove_accepted_course(hub_pda, hub_authority, accepted_course_pda);
    let ix_create_course_list =
        ix_create_course_list(hub_pda, course_list_pda, hub_authority, course_list_index);
    let ix_add_course_to_list = ix_add_course_to_list(
        hub_pda,
        hub_authority,
        course_list_pda,
        accepted_course_pda,
        course_list_index,
    );
    let ix_remove_course_from_list = ix_remove_course_from_list(
        hub_pda,
        hub_authority,
        course_list_pda,
        accepted_course_pda,
        course_list_index,
        true,
    );

    ctx.process_and_validate_instruction_chain(&[
        (&ix_add_accepted_course, &[Check::success()]),
        (&ix_remove_accepted_course, &[Check::success()]),
        (&ix_create_course_list, &[Check::success()]),
        (&ix_add_course_to_list, &[Check::success()]),
        (&ix_remove_course_from_list, &[Check::success()]),
    ]);

    let store_ref = ctx.account_store.borrow();

    let hub_account = store_ref.get(&hub_pda).expect("hub account");
    let mut hub_data: &[u8] = hub_account.data.as_slice();
    let hub_state = Hub::try_deserialize(&mut hub_data).expect("hub deserialize");
    assert!(hub_state
        .accepted_providers
        .contains(&accepted_provider_authority));
    assert!(!hub_state
        .accepted_providers
        .contains(&pending_provider_authority));
    assert!(!hub_state.accepted_courses.contains(&pending_course_pda));
    assert!(!hub_state.accepted_courses.contains(&course_list_pda));

    let accepted_course_account = store_ref
        .get(&accepted_course_pda)
        .expect("accepted course");
    let mut accepted_course_data: &[u8] = accepted_course_account.data.as_slice();
    let accepted_course =
        Course::try_deserialize(&mut accepted_course_data).expect("accepted course deserialize");
    assert_eq!(accepted_course.status, CourseStatus::InReview);

    let course_list_account = store_ref.get(&course_list_pda).expect("course list");
    let mut course_list_data: &[u8] = course_list_account.data.as_slice();
    let course_list =
        CourseList::try_deserialize(&mut course_list_data).expect("course list deserialize");
    assert_eq!(course_list.index, course_list_index);
    assert!(course_list.courses.is_empty());
}

fn ix_initialize_hub(hub_pda: Pubkey, hub_authority: Pubkey) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("initialize_hub"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    )
}

fn ix_initialize_provider(
    hub_pda: Pubkey,
    provider_pda: Pubkey,
    provider_authority: Pubkey,
    name: &str,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct InitializeProviderArgs {
        name: String,
        description: String,
        website: String,
        email: String,
        provider_type: String,
    }

    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "initialize_provider",
            &InitializeProviderArgs {
                name: name.to_string(),
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
    )
}

fn ix_add_accepted_provider(
    hub_pda: Pubkey,
    hub_authority: Pubkey,
    provider_pda: Pubkey,
    provider_authority: Pubkey,
) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("add_accepted_provider"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(provider_pda, false),
            AccountMeta::new_readonly(provider_authority, false),
        ],
    )
}

fn ix_remove_accepted_provider(
    hub_pda: Pubkey,
    hub_authority: Pubkey,
    provider_authority: Pubkey,
) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("remove_accepted_provider"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(provider_authority, false),
        ],
    )
}

fn ix_update_hub_config(
    hub_pda: Pubkey,
    hub_authority: Pubkey,
    require_provider_approval: bool,
    min_reputation_score: u64,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct HubConfigArgs {
        require_provider_approval: bool,
        min_reputation_score: u64,
    }

    #[derive(AnchorSerialize)]
    struct UpdateHubConfigArgs {
        config: HubConfigArgs,
    }

    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "update_hub_config",
            &UpdateHubConfigArgs {
                config: HubConfigArgs {
                    require_provider_approval,
                    min_reputation_score,
                },
            },
        ),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
        ],
    )
}

fn ix_create_course(
    hub_pda: Pubkey,
    provider_pda: Pubkey,
    provider_authority: Pubkey,
    course_pda: Pubkey,
    course_creation_timestamp: i64,
    course_name: &str,
) -> Instruction {
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

    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "create_course",
            &CreateCourseArgs {
                creation_timestamp: course_creation_timestamp,
                name: course_name.to_string(),
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
    )
}

fn ix_add_accepted_course(
    hub_pda: Pubkey,
    hub_authority: Pubkey,
    course_pda: Pubkey,
) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("add_accepted_course"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new(course_pda, false),
        ],
    )
}

fn ix_remove_accepted_course(
    hub_pda: Pubkey,
    hub_authority: Pubkey,
    course_pda: Pubkey,
) -> Instruction {
    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data_no_args("remove_accepted_course"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new(course_pda, false),
        ],
    )
}

fn ix_create_course_list(
    hub_pda: Pubkey,
    course_list_pda: Pubkey,
    hub_authority: Pubkey,
    course_list_index: u16,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct CreateCourseListArgs {
        course_list_index: u16,
    }

    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "create_course_list",
            &CreateCourseListArgs { course_list_index },
        ),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(course_list_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    )
}

fn ix_add_course_to_list(
    hub_pda: Pubkey,
    hub_authority: Pubkey,
    course_list_pda: Pubkey,
    course_pda: Pubkey,
    course_list_index: u16,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct AddCourseToListArgs {
        course_list_index: u16,
    }

    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "add_course_to_list",
            &AddCourseToListArgs { course_list_index },
        ),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new(course_list_pda, false),
            AccountMeta::new_readonly(course_pda, false),
        ],
    )
}

fn ix_remove_course_from_list(
    hub_pda: Pubkey,
    hub_authority: Pubkey,
    course_list_pda: Pubkey,
    course_pda: Pubkey,
    course_list_index: u16,
    remove_reference_if_empty: bool,
) -> Instruction {
    #[derive(AnchorSerialize)]
    struct RemoveCourseFromListArgs {
        course_list_index: u16,
        remove_reference_if_empty: bool,
    }

    Instruction::new_with_bytes(
        PROGRAM_ID,
        &anchor_ix_data(
            "remove_course_from_list",
            &RemoveCourseFromListArgs {
                course_list_index,
                remove_reference_if_empty,
            },
        ),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new(course_list_pda, false),
            AccountMeta::new_readonly(course_pda, false),
        ],
    )
}

fn mollusk_with_program(now: i64) -> Mollusk {
    let elf = load_fair_credit_elf();
    let mut mollusk = Mollusk::default();
    mollusk.sysvars.clock.unix_timestamp = now;
    mollusk.add_program_with_elf_and_loader(&PROGRAM_ID, &elf, &loader_keys::LOADER_V3);
    mollusk
}

fn load_fair_credit_elf() -> Vec<u8> {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
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
