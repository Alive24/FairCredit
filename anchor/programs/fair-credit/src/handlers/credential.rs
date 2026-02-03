use crate::events::*;
use crate::state::*;
use crate::types::CourseError;
use crate::types::{CourseStatus, CredentialMetadata, CredentialStatus};
use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{mint_to, Mint, MintTo, Token, TokenAccount};
use mpl_token_metadata::instructions::CreateMetadataAccountV3CpiBuilder;
use mpl_token_metadata::types::DataV2;

// Simplified credential handlers that work with existing credential system

/// CreateCredential is called by the **student**; provider only adds to accepted_credentials via ApproveCredential.
#[derive(Accounts)]
pub struct CreateCredential<'info> {
    #[account(
        init,
        payer = student,
        space = 8 + Credential::INIT_SPACE,
        seeds = [
            Credential::SEED_PREFIX.as_bytes(),
            course.key().as_ref(),
            student.key().as_ref(),
        ],
        bump
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &course.creation_timestamp.to_le_bytes(),
        ],
        bump,
        constraint = course.provider == provider.wallet,
        constraint = course.status == CourseStatus::Verified @ CourseError::CourseNotActive
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.wallet.as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    #[account(mut)]
    pub student: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct LinkActivityToCredential<'info> {
    #[account(
        mut,
        seeds = [
            Credential::SEED_PREFIX.as_bytes(),
            credential.course.as_ref(),
            credential.student_wallet.as_ref(),
        ],
        bump,
        constraint = credential.student_wallet == student.key()
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        seeds = [
            Activity::SEED_PREFIX.as_bytes(),
            activity.provider.as_ref(),
            activity.student.as_ref(),
            &activity.created.to_le_bytes(),
        ],
        bump
    )]
    pub activity: Account<'info, Activity>,
    pub student: Signer<'info>,
}

#[derive(Accounts)]
pub struct ApproveCredential<'info> {
    #[account(
        mut,
        seeds = [
            Credential::SEED_PREFIX.as_bytes(),
            credential.course.as_ref(),
            credential.student_wallet.as_ref(),
        ],
        bump,
        constraint = credential.provider_wallet == provider_authority.key(),
        constraint = credential.course == course.key(),
        constraint = credential.status == CredentialStatus::Endorsed @ crate::types::CredentialError::NotEndorsed
    )]
    pub credential: Account<'info, Credential>,
    #[account(
        mut,
        seeds = [
            Course::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider.key().as_ref(),
            &course.creation_timestamp.to_le_bytes(),
        ],
        bump,
        constraint = course.provider == provider_authority.key()
    )]
    pub course: Account<'info, Course>,
    #[account(
        seeds = [
            Provider::SEED_PREFIX.as_bytes(),
            hub.key().as_ref(),
            provider_authority.key().as_ref(),
        ],
        bump
    )]
    pub provider: Account<'info, Provider>,
    #[account(seeds = [Hub::SEED_PREFIX.as_bytes()], bump)]
    pub hub: Account<'info, Hub>,
    pub provider_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct EndorseCredential<'info> {
    #[account(
        mut,
        seeds = [
            Credential::SEED_PREFIX.as_bytes(),
            credential.course.as_ref(),
            credential.student_wallet.as_ref(),
        ],
        bump
    )]
    pub credential: Account<'info, Credential>,
    #[account(mut)]
    pub mentor: Signer<'info>,
}

/// Create credential: metadata (title, description) comes from course; no endorsement/completion/ipfs at creation.
pub fn create_credential(ctx: Context<CreateCredential>) -> Result<()> {
    let credential_key = ctx.accounts.credential.key();
    let credential = &mut ctx.accounts.credential;
    let course = &ctx.accounts.course;
    let clock = Clock::get()?;

    credential.created = clock.unix_timestamp;
    credential.updated = clock.unix_timestamp;
    credential.student_wallet = ctx.accounts.student.key();
    credential.mentor_wallet = Pubkey::default(); // set when mentor endorses
    credential.provider_wallet = ctx.accounts.course.provider;
    credential.nft_mint = Pubkey::default(); // set when student mints NFT
    credential.course = ctx.accounts.course.key();
    credential.verification_count = 0;
    credential.status = CredentialStatus::Pending;

    credential.metadata = CredentialMetadata {
        title: course.name.clone(),
        description: course.description.clone(),
        skills_acquired: Vec::new(),
        research_output: None,
        mentor_endorsement: String::new(),
        completion_date: 0,
        activities: Vec::new(),
    };

    emit!(CredentialCreated {
        credential: credential_key,
        provider: credential.provider_wallet,
        student: credential.student_wallet,
        mentor: credential.mentor_wallet,
        title: credential.metadata.title.clone(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

pub fn endorse_credential(
    ctx: Context<EndorseCredential>,
    endorsement_message: String,
) -> Result<()> {
    let credential = &mut ctx.accounts.credential;

    if credential.mentor_wallet == Pubkey::default() {
        credential.mentor_wallet = ctx.accounts.mentor.key();
    } else {
        require!(
            credential.mentor_wallet == ctx.accounts.mentor.key(),
            crate::types::CredentialError::UnauthorizedEndorser
        );
    }
    credential.metadata.mentor_endorsement = endorsement_message;
    credential.update_status(CredentialStatus::Endorsed);

    Ok(())
}

/// Student links one of their activities to this credential (activity must be created by same student).
pub fn link_activity_to_credential(ctx: Context<LinkActivityToCredential>) -> Result<()> {
    let credential = &mut ctx.accounts.credential;
    let activity = &ctx.accounts.activity;

    require!(
        credential.student_wallet == ctx.accounts.student.key(),
        crate::types::CredentialError::ActivityNotOwnedByStudent
    );
    require!(
        activity.student == ctx.accounts.student.key(),
        crate::types::CredentialError::ActivityNotOwnedByStudent
    );
    require!(
        credential.metadata.activities.len() < 20,
        crate::types::CredentialError::TooManyActivities
    );
    require!(
        !credential.metadata.activities.contains(&activity.key()),
        crate::types::CredentialError::ActivityAlreadyLinked
    );

    credential.metadata.activities.push(activity.key());
    credential.updated = Clock::get()?.unix_timestamp;

    Ok(())
}

/// Provider approves an endorsed credential and adds it to the course's approved_credentials.
pub fn approve_credential(ctx: Context<ApproveCredential>) -> Result<()> {
    let credential = &ctx.accounts.credential;
    let course = &mut ctx.accounts.course;

    course.add_approved_credential(credential.key())?;
    ctx.accounts
        .credential
        .update_status(CredentialStatus::Verified);

    Ok(())
}

pub fn generate_user_token(_ctx: Context<GenerateUserToken>, user_id: String) -> Result<String> {
    // In a real implementation, this would generate a JWT or similar token
    // For now, we'll return a simple concatenated string
    let token = format!("{}_{}", user_id, Clock::get()?.unix_timestamp);
    Ok(token)
}

/// Seed for credential NFT mint PDA (one mint per credential).
pub const CREDENTIAL_NFT_MINT_SEED: &[u8] = b"credential_nft_mint";
/// Fixed symbol for credential NFTs (Metaplex DataV2 requires symbol; use constant, not client input).
pub const CREDENTIAL_NFT_SYMBOL: &str = "FairCredit";
/// Base URL for credential NFT metadata; FairCredit provides this, URI = base + "/" + credential_pubkey.
const CREDENTIAL_NFT_URI_BASE: &str = "https://faircredit.io/credential";
/// Metaplex Token Metadata max name length (chars).
const METADATA_MAX_NAME_LEN: usize = 32;

#[derive(Accounts)]
pub struct MintCredentialNft<'info> {
    #[account(
        mut,
        seeds = [
            Credential::SEED_PREFIX.as_bytes(),
            credential.course.as_ref(),
            credential.student_wallet.as_ref(),
        ],
        bump,
        constraint = credential.student_wallet == student.key() @ crate::types::CredentialError::NotVerified,
        constraint = credential.status == CredentialStatus::Verified @ crate::types::CredentialError::NotVerified,
        constraint = credential.status != CredentialStatus::Minted @ crate::types::CredentialError::AlreadyMinted
    )]
    pub credential: Account<'info, Credential>,
    #[account(mut)]
    pub student: Signer<'info>,
    #[account(
        init,
        payer = student,
        mint::decimals = 0,
        mint::authority = credential,
        seeds = [CREDENTIAL_NFT_MINT_SEED, credential.key().as_ref()],
        bump
    )]
    pub mint: Account<'info, Mint>,
    #[account(
        init,
        payer = student,
        associated_token::mint = mint,
        associated_token::authority = student
    )]
    pub student_token_account: Account<'info, TokenAccount>,
    /// CHECK: Metadata PDA of mpl-token-metadata (validated in handler)
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    /// CHECK: Rent sysvar (optional for CreateMetadataAccountV3)
    pub rent: UncheckedAccount<'info>,
    /// CHECK: mpl-token-metadata program
    pub mpl_token_metadata_program: UncheckedAccount<'info>,
}

pub fn mint_credential_nft(ctx: Context<MintCredentialNft>) -> Result<()> {
    let clock = Clock::get()?;

    // Validate metadata PDA: ['metadata', mpl_program_id, mint]
    let (metadata_pda, _) = Pubkey::find_program_address(
        &[
            b"metadata",
            ctx.accounts.mpl_token_metadata_program.key().as_ref(),
            ctx.accounts.mint.key().as_ref(),
        ],
        &ctx.accounts.mpl_token_metadata_program.key(),
    );
    require!(
        metadata_pda == ctx.accounts.metadata.key(),
        crate::types::CredentialError::NotVerified
    );

    let cred_bump = ctx.bumps.credential;
    let seeds = &[
        Credential::SEED_PREFIX.as_bytes(),
        ctx.accounts.credential.course.as_ref(),
        ctx.accounts.credential.student_wallet.as_ref(),
        &[cred_bump],
    ];
    let signer_seeds: &[&[&[u8]]] = &[seeds];

    // name from credential.metadata.title (truncate to Metaplex 32-char limit)
    let name: String = ctx
        .accounts
        .credential
        .metadata
        .title
        .chars()
        .take(METADATA_MAX_NAME_LEN)
        .collect();
    // uri: FairCredit-provided URL pattern (base + credential pubkey)
    let uri = format!(
        "{}/{}",
        CREDENTIAL_NFT_URI_BASE,
        ctx.accounts.credential.key()
    );

    // 1. Create Metaplex metadata (DAS-compatible): name from credential, uri from FairCredit
    let data = DataV2 {
        name,
        symbol: CREDENTIAL_NFT_SYMBOL.to_string(),
        uri,
        seller_fee_basis_points: 0,
        creators: None,
        collection: None,
        uses: None,
    };
    CreateMetadataAccountV3CpiBuilder::new(
        &ctx.accounts.mpl_token_metadata_program.to_account_info(),
    )
    .metadata(&ctx.accounts.metadata.to_account_info())
    .mint(&ctx.accounts.mint.to_account_info())
    .mint_authority(&ctx.accounts.credential.to_account_info())
    .payer(&ctx.accounts.student.to_account_info())
    .update_authority(&ctx.accounts.credential.to_account_info(), true)
    .system_program(&ctx.accounts.system_program.to_account_info())
    .rent(Some(&ctx.accounts.rent.to_account_info()))
    .data(data)
    .is_mutable(true)
    .invoke_signed(signer_seeds)?;

    // 2. Mint 1 token to student (credential PDA is mint authority)
    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.student_token_account.to_account_info(),
                authority: ctx.accounts.credential.to_account_info(),
            },
            signer_seeds,
        ),
        1,
    )?;

    let credential = &mut ctx.accounts.credential;
    credential.nft_mint = ctx.accounts.mint.key();
    credential.update_status(CredentialStatus::Minted);

    emit!(CredentialMinted {
        credential: credential.key(),
        student: credential.student_wallet,
        mint: ctx.accounts.mint.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct GenerateUserToken<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
}
