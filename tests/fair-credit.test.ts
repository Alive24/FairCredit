import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { expect } from "chai";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("FairCredit Program Tests", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.FairCredit as Program<FairCredit>;
  
  let providerWallet: Keypair;
  let verifierWallet: Keypair;
  let studentWallet: Keypair;
  let mentorWallet: Keypair;
  
  let providerPDA: PublicKey;
  let verifierPDA: PublicKey;
  let credentialPDA: PublicKey;
  let hubPDA: PublicKey;
  
  const credentialId = 1;

  before(async () => {
    // Generate test wallets
    providerWallet = Keypair.generate();
    verifierWallet = Keypair.generate();
    studentWallet = Keypair.generate();
    mentorWallet = Keypair.generate();

    // Fund test wallets
    const airdropPromises = [
      provider.connection.requestAirdrop(providerWallet.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(verifierWallet.publicKey, 2 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(studentWallet.publicKey, 1 * LAMPORTS_PER_SOL),
      provider.connection.requestAirdrop(mentorWallet.publicKey, 1 * LAMPORTS_PER_SOL),
    ];
    
    await Promise.all(airdropPromises);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for airdrops to confirm

    // Derive PDAs
    [providerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), providerWallet.publicKey.toBuffer()],
      program.programId
    );

    [verifierPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("verifier"), verifierWallet.publicKey.toBuffer()],
      program.programId
    );

    [credentialPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), Buffer.from(credentialId.toString())],
      program.programId
    );

    [hubPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("hub")],
      program.programId
    );
  });

  describe("Provider Management", () => {
    it("Should initialize a provider", async () => {
      const tx = await program.methods
        .initializeProvider(
          "Tech Academy",
          "Leading technology education provider",
          "https://techacademy.com",
          "contact@techacademy.com",
          "education"
        )
        .accounts({
          providerAccount: providerPDA,
          providerAuthority: providerWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([providerWallet])
        .rpc();

      console.log("Provider initialized:", tx);

      // Verify provider account
      const providerAccount = await program.account.provider.fetch(providerPDA);
      expect(providerAccount.name).to.equal("Tech Academy");
      expect(providerAccount.wallet.toString()).to.equal(providerWallet.publicKey.toString());
    });

    it("Should initialize a verifier", async () => {
      const tx = await program.methods
        .initializeVerifier()
        .accounts({
          verifierAccount: verifierPDA,
          verifierAuthority: verifierWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([verifierWallet])
        .rpc();

      console.log("Verifier initialized:", tx);

      // Verify verifier account
      const verifierAccount = await program.account.verifier.fetch(verifierPDA);
      expect(verifierAccount.wallet.toString()).to.equal(verifierWallet.publicKey.toString());
    });

    it("Should allow verifier to set provider reputation", async () => {
      const reputationScore = 85;
      const note = "Excellent educational standards";

      const tx = await program.methods
        .setProviderReputation(new anchor.BN(reputationScore), note)
        .accounts({
          verifierAccount: verifierPDA,
          verifier: verifierWallet.publicKey,
          provider: providerWallet.publicKey,
        })
        .signers([verifierWallet])
        .rpc();

      console.log("Provider reputation set:", tx);
    });
  });

  describe("Credential Management", () => {
    it("Should create a credential", async () => {
      const nftMint = Keypair.generate();
      
      const tx = await program.methods
        .createCredential(
          new anchor.BN(credentialId),
          "Advanced Blockchain Development",
          "Comprehensive course on Solana smart contract development",
          ["Rust", "Anchor", "Web3", "Smart Contracts"],
          "Built a decentralized exchange",
          "Pending mentor endorsement",
          new anchor.BN(Date.now() / 1000),
          "QmXxxxxIPFSHASHxxxxx"
        )
        .accounts({
          credential: credentialPDA,
          provider: providerPDA,
          providerAuthority: providerWallet.publicKey,
          studentWallet: studentWallet.publicKey,
          mentorWallet: mentorWallet.publicKey,
          nftMint: nftMint.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([providerWallet])
        .rpc();

      console.log("Credential created:", tx);

      // Verify credential account
      const credentialAccount = await program.account.credential.fetch(credentialPDA);
      expect(credentialAccount.id.toNumber()).to.equal(credentialId);
      expect(credentialAccount.metadata.title).to.equal("Advanced Blockchain Development");
      expect(credentialAccount.studentWallet.toString()).to.equal(studentWallet.publicKey.toString());
    });

    it("Should allow mentor to endorse credential", async () => {
      const endorsementMessage = "Outstanding work on the DEX project. Highly recommend!";

      const tx = await program.methods
        .endorseCredential(endorsementMessage)
        .accounts({
          credential: credentialPDA,
          mentor: mentorWallet.publicKey,
        })
        .signers([mentorWallet])
        .rpc();

      console.log("Credential endorsed:", tx);

      // Verify endorsement
      const credentialAccount = await program.account.credential.fetch(credentialPDA);
      expect(credentialAccount.metadata.mentorEndorsement).to.equal(endorsementMessage);
      expect(credentialAccount.status).to.deep.equal({ endorsed: {} });
    });

    it("Should allow credential verification", async () => {
      const verifierKeypair = Keypair.generate();
      await provider.connection.requestAirdrop(verifierKeypair.publicKey, 1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [verificationRecordPDA] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("verification"),
          Buffer.from(credentialId.toString()),
          verifierKeypair.publicKey.toBuffer()
        ],
        program.programId
      );

      const tx = await program.methods
        .verifyCredential()
        .accounts({
          credential: credentialPDA,
          verificationRecord: verificationRecordPDA,
          verifier: verifierKeypair.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([verifierKeypair])
        .rpc();

      console.log("Credential verified:", tx);

      // Check verification count increased
      const credentialAccount = await program.account.credential.fetch(credentialPDA);
      expect(credentialAccount.verificationCount.toNumber()).to.equal(1);
    });
  });

  describe("Provider Suspension", () => {
    it("Should allow verifier to suspend a provider", async () => {
      const tx = await program.methods
        .suspendProvider()
        .accounts({
          verifierAccount: verifierPDA,
          verifier: verifierWallet.publicKey,
          providerToSuspend: providerWallet.publicKey,
        })
        .signers([verifierWallet])
        .rpc();

      console.log("Provider suspended:", tx);
    });

    it("Should allow verifier to unsuspend a provider", async () => {
      const tx = await program.methods
        .unsuspendProvider()
        .accounts({
          verifierAccount: verifierPDA,
          verifier: verifierWallet.publicKey,
          providerToUnsuspend: providerWallet.publicKey,
        })
        .signers([verifierWallet])
        .rpc();

      console.log("Provider unsuspended:", tx);
    });
  });

  describe("Hub Management", () => {
    it("Should initialize the hub", async () => {
      const tx = await program.methods
        .initializeHub()
        .accounts({
          hub: hubPDA,
          authority: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("Hub initialized:", tx);

      // Verify hub account
      const hubAccount = await program.account.hub.fetch(hubPDA);
      expect(hubAccount.authority.toString()).to.equal(provider.wallet.publicKey.toString());
      expect(hubAccount.acceptedProviders).to.be.empty;
      expect(hubAccount.acceptedEndorsers).to.be.empty;
    });

    it("Should add accepted provider to hub", async () => {
      const tx = await program.methods
        .addAcceptedProvider()
        .accounts({
          hub: hubPDA,
          authority: provider.wallet.publicKey,
          provider: providerPDA,
          providerWallet: providerWallet.publicKey,
        })
        .rpc();

      console.log("Provider added to hub:", tx);

      // Verify provider was added
      const hubAccount = await program.account.hub.fetch(hubPDA);
      expect(hubAccount.acceptedProviders).to.have.lengthOf(1);
      expect(hubAccount.acceptedProviders[0].toString()).to.equal(providerWallet.publicKey.toString());
    });

    it("Should add accepted endorser to hub", async () => {
      const tx = await program.methods
        .addAcceptedEndorser()
        .accounts({
          hub: hubPDA,
          authority: provider.wallet.publicKey,
          endorserWallet: mentorWallet.publicKey,
        })
        .rpc();

      console.log("Endorser added to hub:", tx);

      // Verify endorser was added
      const hubAccount = await program.account.hub.fetch(hubPDA);
      expect(hubAccount.acceptedEndorsers).to.have.lengthOf(1);
      expect(hubAccount.acceptedEndorsers[0].toString()).to.equal(mentorWallet.publicKey.toString());
    });

    it("Should update hub configuration", async () => {
      const newConfig = {
        requireProviderApproval: false,
        requireEndorserApproval: true,
        minReputationScore: new anchor.BN(80),
        allowSelfEndorsement: false,
      };

      const tx = await program.methods
        .updateHubConfig(newConfig)
        .accounts({
          hub: hubPDA,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      console.log("Hub config updated:", tx);

      // Verify config was updated
      const hubAccount = await program.account.hub.fetch(hubPDA);
      expect(hubAccount.config.requireProviderApproval).to.be.false;
      expect(hubAccount.config.requireEndorserApproval).to.be.true;
      expect(hubAccount.config.minReputationScore.toNumber()).to.equal(80);
    });
  });

  describe("Course Management with Hub Integration", () => {
    let coursePDA: PublicKey;
    const courseId = "SOLANA101";

    before(async () => {
      // Derive course PDA
      [coursePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("course"), Buffer.from(courseId)],
        program.programId
      );
    });

    it("Should create a course", async () => {
      const tx = await program.methods
        .createCourse(
          courseId,
          "Solana Development 101",
          "Introduction to Solana blockchain development",
          100, // workload required
          null  // no degree ID
        )
        .accounts({
          course: coursePDA,
          provider: providerPDA,
          providerAuthority: providerWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([providerWallet])
        .rpc();

      console.log("Course created:", tx);

      // Verify course account
      const courseAccount = await program.account.course.fetch(coursePDA);
      expect(courseAccount.id).to.equal(courseId);
      expect(courseAccount.name).to.equal("Solana Development 101");
      expect(courseAccount.provider.toString()).to.equal(providerWallet.publicKey.toString());
    });

    it("Should add accepted course to hub", async () => {
      const tx = await program.methods
        .addAcceptedCourse(courseId)
        .accounts({
          hub: hubPDA,
          authority: provider.wallet.publicKey,
          course: coursePDA,
        })
        .rpc();

      console.log("Course added to hub:", tx);

      // Verify course was added
      const hubAccount = await program.account.hub.fetch(hubPDA);
      expect(hubAccount.acceptedCourses).to.have.lengthOf(1);
      expect(hubAccount.acceptedCourses[0]).to.equal(courseId);
    });

    it("Should fail to add course from non-accepted provider", async () => {
      // Create a new non-accepted provider
      const newProviderWallet = Keypair.generate();
      await provider.connection.requestAirdrop(newProviderWallet.publicKey, 1 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [newProviderPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("provider"), newProviderWallet.publicKey.toBuffer()],
        program.programId
      );

      // Initialize the new provider
      await program.methods
        .initializeProvider(
          "Non-Accepted Provider",
          "Test provider",
          "https://test.com",
          "test@test.com",
          "education"
        )
        .accounts({
          providerAccount: newProviderPDA,
          providerAuthority: newProviderWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newProviderWallet])
        .rpc();

      // Create a course from non-accepted provider
      const newCourseId = "TEST123";
      const [newCoursePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("course"), Buffer.from(newCourseId)],
        program.programId
      );

      await program.methods
        .createCourse(
          newCourseId,
          "Test Course",
          "Test description",
          50,
          null
        )
        .accounts({
          course: newCoursePDA,
          provider: newProviderPDA,
          providerAuthority: newProviderWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([newProviderWallet])
        .rpc();

      // Try to add course to hub - should fail
      try {
        await program.methods
          .addAcceptedCourse(newCourseId)
          .accounts({
            hub: hubPDA,
            authority: provider.wallet.publicKey,
            course: newCoursePDA,
          })
          .rpc();
        
        expect.fail("Should have failed - provider not accepted");
      } catch (error) {
        expect(error.toString()).to.include("ProviderNotAccepted");
      }
    });

    it("Should remove accepted course from hub", async () => {
      const tx = await program.methods
        .removeAcceptedCourse(courseId)
        .accounts({
          hub: hubPDA,
          authority: provider.wallet.publicKey,
        })
        .rpc();

      console.log("Course removed from hub:", tx);

      // Verify course was removed
      const hubAccount = await program.account.hub.fetch(hubPDA);
      expect(hubAccount.acceptedCourses).to.be.empty;
    });
  });
});