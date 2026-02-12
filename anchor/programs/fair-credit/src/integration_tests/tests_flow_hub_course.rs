#![cfg(test)]

use {
    anchor_lang::{AccountDeserialize, AnchorSerialize, Space},
    mollusk_svm::{program::loader_keys, result::Check, Mollusk},
    solana_account::Account,
    solana_instruction::{AccountMeta, Instruction},
    solana_pubkey::Pubkey,
    solana_sdk_ids::system_program,
    solana_sdk::hash,
    std::{collections::HashMap, path::PathBuf},
};

#[test]
fn flow_hub_provider_course() {
    use crate::state::{Course, Hub, Provider};
    use crate::types::CourseStatus;

    let now: i64 = 1_700_000_000;

    let hub_authority = Pubkey::new_unique();
    let provider_authority = Pubkey::new_unique();

    let (hub_pda, _hub_bump) = Pubkey::find_program_address(&[b"hub"], &program_id());
    let (provider_pda, _provider_bump) = Pubkey::find_program_address(
        &[b"provider", hub_pda.as_ref(), provider_authority.as_ref()],
        &program_id(),
    );

    let course_creation_timestamp = now;
    let (course_pda, _course_bump) = Pubkey::find_program_address(
        &[
            b"course",
            hub_pda.as_ref(),
            provider_pda.as_ref(),
            &course_creation_timestamp.to_le_bytes(),
        ],
        &program_id(),
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

    // Uninitialized PDAs (must be system-owned for create_account via invoke_signed).
    store.insert(hub_pda, Account::new(0, 0, &system_program::id()));
    store.insert(provider_pda, Account::new(0, 0, &system_program::id()));
    store.insert(course_pda, Account::new(0, 0, &system_program::id()));

    let ctx = mollusk.with_context(store);

    // 1) initialize_hub
    let ix_initialize_hub = Instruction::new_with_bytes(
        program_id(),
        &anchor_ix_data_no_args("initialize_hub"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(system_program::id(), false),
        ],
    );

    // 2) initialize_provider
    #[derive(AnchorSerialize)]
    struct InitializeProviderArgs {
        name: String,
        description: String,
        website: String,
        email: String,
        provider_type: String,
    }
    let ix_initialize_provider = Instruction::new_with_bytes(
        program_id(),
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

    // 3) add_accepted_provider
    let ix_add_accepted_provider = Instruction::new_with_bytes(
        program_id(),
        &anchor_ix_data_no_args("add_accepted_provider"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new_readonly(provider_pda, false),
            AccountMeta::new_readonly(provider_authority, false),
        ],
    );

    // 4) create_course
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
        program_id(),
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

    // 5) add_accepted_course
    let ix_add_accepted_course = Instruction::new_with_bytes(
        program_id(),
        &anchor_ix_data_no_args("add_accepted_course"),
        vec![
            AccountMeta::new(hub_pda, false),
            AccountMeta::new(hub_authority, true),
            AccountMeta::new(course_pda, false),
        ],
    );

    ctx.process_and_validate_instruction_chain(&[
        (
            &ix_initialize_hub,
            &[
                Check::success(),
                Check::account(&hub_pda)
                    .owner(&program_id())
                    .space(8 + Hub::INIT_SPACE)
                    .rent_exempt()
                    .build(),
            ][..],
        ),
        (
            &ix_initialize_provider,
            &[
                Check::success(),
                Check::account(&provider_pda)
                    .owner(&program_id())
                    .space(8 + Provider::INIT_SPACE)
                    .rent_exempt()
                    .build(),
            ][..],
        ),
        (&ix_add_accepted_provider, &[Check::success()][..]),
        (
            &ix_create_course,
            &[
                Check::success(),
                Check::account(&course_pda)
                    .owner(&program_id())
                    .space(8 + Course::INIT_SPACE)
                    .rent_exempt()
                    .build(),
            ][..],
        ),
        (&ix_add_accepted_course, &[Check::success()][..]),
    ]);

    // Deserialize resulting state and validate the flow outcomes.
    let store_ref = ctx.account_store.borrow();

    let hub_account = store_ref.get(&hub_pda).expect("hub account");
    let mut hub_data: &[u8] = hub_account.data.as_slice();
    let hub_state = Hub::try_deserialize(&mut hub_data).expect("hub deserialize");
    assert!(
        hub_state
            .accepted_providers
            .iter()
            .any(|pk| pk.to_bytes() == provider_authority.to_bytes())
    );
    assert!(
        hub_state
            .accepted_courses
            .iter()
            .any(|pk| pk.to_bytes() == course_pda.to_bytes())
    );

    let provider_account = store_ref.get(&provider_pda).expect("provider account");
    let mut provider_data: &[u8] = provider_account.data.as_slice();
    let provider_state =
        Provider::try_deserialize(&mut provider_data).expect("provider deserialize");
    assert_eq!(provider_state.wallet.to_bytes(), provider_authority.to_bytes());

    let course_account = store_ref.get(&course_pda).expect("course account");
    let mut course_data: &[u8] = course_account.data.as_slice();
    let course_state = Course::try_deserialize(&mut course_data).expect("course deserialize");
    assert_eq!(course_state.status, CourseStatus::Accepted);
}

fn mollusk_with_program(now: i64) -> Mollusk {
    let elf = load_fair_credit_elf();
    let mut mollusk = Mollusk::default();
    mollusk.sysvars.clock.unix_timestamp = now;
    mollusk.add_program_with_loader_and_elf(&program_id(), &loader_keys::LOADER_V3, &elf);
    mollusk
}

fn program_id() -> Pubkey {
    Pubkey::new_from_array(crate::ID.to_bytes())
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
        "fair_credit.so not found. Expected at anchor/target/deploy/fair_credit.so after running `anchor build`."
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
    let hash = hash::hash(preimage.as_bytes()).to_bytes();
    hash[..8].try_into().expect("discriminator")
}
