import BN from "bn.js";
import { expect } from "chai";
import { createSolanaRpc } from "@solana/kit";
import { address, type Address, type TransactionSigner } from "@solana/kit";
import { generateKeyPairSigner } from "@solana/signers";
import {
  getCoursePDA,
  getCredentialPDA,
  getHubPDA,
  getProviderPDA,
  toLE8,
  sendInstructions,
  requestAirdrop,
  generateTestSigner,
  getRpcUrl,
  LAMPORTS_PER_SOL,
} from "./utils/test-helpers";
import { getInitializeProviderInstructionAsync } from "../lib/solana/generated/instructions/initializeProvider";
import { getCreateCredentialInstructionAsync } from "../lib/solana/generated/instructions/createCredential";
import { getEndorseCredentialInstruction } from "../lib/solana/generated/instructions/endorseCredential";
import { getInitializeHubInstructionAsync } from "../lib/solana/generated/instructions/initializeHub";
import { getAddAcceptedProviderInstructionAsync } from "../lib/solana/generated/instructions/addAcceptedProvider";
import { getUpdateHubConfigInstructionAsync } from "../lib/solana/generated/instructions/updateHubConfig";
import { getCreateCourseInstructionAsync } from "../lib/solana/generated/instructions/createCourse";
import { getAddAcceptedCourseInstructionAsync } from "../lib/solana/generated/instructions/addAcceptedCourse";
import { getRemoveAcceptedCourseInstructionAsync } from "../lib/solana/generated/instructions/removeAcceptedCourse";
import { fetchProvider } from "../lib/solana/generated/accounts/provider";
import { fetchCredential } from "../lib/solana/generated/accounts/credential";
import { fetchHub } from "../lib/solana/generated/accounts/hub";
import { fetchCourse } from "../lib/solana/generated/accounts/course";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "../lib/solana/generated/programs";

describe("FairCredit Program Tests", () => {
  const rpcUrl = getRpcUrl();
  const rpc = createSolanaRpc(rpcUrl);

  let providerWallet: TransactionSigner;
  let studentWallet: TransactionSigner;
  let mentorWallet: TransactionSigner;
  let hubAuthority: TransactionSigner;

  let providerPDA: Address;
  let credentialPDA: Address;
  let hubPDA: Address;

  const credentialId = 1;

  before(async () => {
    // Generate test wallets
    providerWallet = await generateTestSigner();
    studentWallet = await generateTestSigner();
    mentorWallet = await generateTestSigner();
    hubAuthority = await generateTestSigner();

    // Fund test wallets
    const airdropPromises = [
      requestAirdrop(rpcUrl, providerWallet.address, 2 * LAMPORTS_PER_SOL),
      requestAirdrop(rpcUrl, studentWallet.address, 1 * LAMPORTS_PER_SOL),
      requestAirdrop(rpcUrl, mentorWallet.address, 1 * LAMPORTS_PER_SOL),
      requestAirdrop(rpcUrl, hubAuthority.address, 2 * LAMPORTS_PER_SOL),
    ];

    await Promise.all(airdropPromises);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for airdrops to confirm

    // Derive PDAs via shared helpers
    [providerPDA] = await getProviderPDA(providerWallet.address);
    [credentialPDA] = await getCredentialPDA(credentialId);
    [hubPDA] = await getHubPDA();
  });

  describe("PDA Utilities", () => {
    it("should derive credential PDAs consistently", async () => {
      const samples: Array<number | bigint | BN> = [
        0,
        1,
        42,
        65535,
        BigInt(2) ** BigInt(32),
        BigInt(Number.MAX_SAFE_INTEGER),
        new BN("1844674407370955161"),
      ];

      for (const sample of samples) {
        const [helperPDA] = await getCredentialPDA(sample);
        // Verify PDA is a valid address
        expect(helperPDA).to.be.a("string");
        expect(helperPDA.length).to.be.greaterThan(0);
      }
    });

    it("should reject invalid credential identifiers", () => {
      expect(() => toLE8(Number.MAX_SAFE_INTEGER + 10)).to.throw(RangeError);
      expect(() => toLE8(-1)).to.throw(RangeError);
    });
  });

  describe("Provider Management", () => {
    it("Should initialize a provider", async () => {
      const instruction = await getInitializeProviderInstructionAsync({
        providerAccount: providerPDA,
        providerAuthority: providerWallet,
        name: "Tech Academy",
        description: "Leading technology education provider",
        website: "https://techacademy.com",
        email: "contact@techacademy.com",
        providerType: "education",
      });

      const tx = await sendInstructions(rpcUrl, [instruction], providerWallet);
      console.log("Provider initialized:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify provider account
      const providerAccount = await fetchProvider(rpc, providerPDA);
      expect(providerAccount.data.name).to.equal("Tech Academy");
      expect(providerAccount.data.wallet).to.equal(providerWallet.address);
    });
  });

  describe("Credential Management", () => {
    it("Should create a credential", async () => {
      const nftMint = await generateTestSigner();

      const instruction = await getCreateCredentialInstructionAsync({
        credential: credentialPDA,
        provider: providerPDA,
        providerAuthority: providerWallet,
        studentWallet: studentWallet.address,
        mentorWallet: mentorWallet.address,
        nftMint: nftMint.address,
        credentialId: BigInt(credentialId),
        title: "Advanced Blockchain Development",
        description:
          "Comprehensive course on Solana smart contract development",
        skillsAcquired: ["Rust", "Anchor", "Web3", "Smart Contracts"],
        researchOutput: "Built a decentralized exchange",
        mentorEndorsement: "Pending mentor endorsement",
        completionDate: BigInt(Math.floor(Date.now() / 1000)),
        ipfsHash: "QmXxxxxIPFSHASHxxxxx",
      });

      const tx = await sendInstructions(rpcUrl, [instruction], providerWallet);
      console.log("Credential created:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify credential account
      const credentialAccount = await fetchCredential(rpc, credentialPDA);
      expect(credentialAccount.data.id).to.equal(BigInt(credentialId));
      expect(credentialAccount.data.metadata.title).to.equal(
        "Advanced Blockchain Development",
      );
      expect(credentialAccount.data.studentWallet).to.equal(
        studentWallet.address,
      );
    });

    it("Should allow mentor to endorse credential", async () => {
      const endorsementMessage =
        "Outstanding work on the DEX project. Highly recommend!";

      const instruction = getEndorseCredentialInstruction({
        credential: credentialPDA,
        mentor: mentorWallet,
        endorsementMessage,
      });

      const tx = await sendInstructions(rpcUrl, [instruction], mentorWallet);
      console.log("Credential endorsed:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify endorsement
      const credentialAccount = await fetchCredential(rpc, credentialPDA);
      expect(credentialAccount.data.metadata.mentorEndorsement).to.equal(
        endorsementMessage,
      );
      // Note: Status check may need adjustment based on actual data structure
    });
  });

  describe("Hub Management", () => {
    it("Should initialize the hub", async () => {
      const instruction = await getInitializeHubInstructionAsync({
        hub: hubPDA,
        authority: hubAuthority,
      });

      const tx = await sendInstructions(rpcUrl, [instruction], hubAuthority);
      console.log("Hub initialized:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify hub account
      const hubAccount = await fetchHub(rpc, hubPDA);
      expect(hubAccount.data.authority).to.equal(hubAuthority.address);
      expect(hubAccount.data.acceptedProviders).to.be.an("array").that.is.empty;
    });

    it("Should add accepted provider to hub", async () => {
      const instruction = await getAddAcceptedProviderInstructionAsync({
        hub: hubPDA,
        authority: hubAuthority,
        provider: providerPDA,
        providerWallet: providerWallet.address,
      });

      const tx = await sendInstructions(rpcUrl, [instruction], hubAuthority);
      console.log("Provider added to hub:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify provider was added
      const hubAccount = await fetchHub(rpc, hubPDA);
      expect(hubAccount.data.acceptedProviders).to.have.lengthOf(1);
      expect(hubAccount.data.acceptedProviders[0]).to.equal(
        providerWallet.address,
      );
    });

    it("Should update hub configuration", async () => {
      const instruction = await getUpdateHubConfigInstructionAsync({
        hub: hubPDA,
        authority: hubAuthority,
        config: {
          requireProviderApproval: false,
          minReputationScore: BigInt(80),
        },
      });

      const tx = await sendInstructions(rpcUrl, [instruction], hubAuthority);
      console.log("Hub config updated:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify config was updated
      const hubAccount = await fetchHub(rpc, hubPDA);
      expect(hubAccount.data.config.requireProviderApproval).to.be.false;
      expect(hubAccount.data.config.minReputationScore).to.equal(BigInt(80));
    });
  });

  describe("Course Management with Hub Integration", () => {
    let coursePDA: Address;
    const courseId = "SOLANA101";

    before(async () => {
      // Derive course PDA
      [coursePDA] = await getCoursePDA(courseId);
    });

    it("Should create a course", async () => {
      const instruction = await getCreateCourseInstructionAsync({
        course: coursePDA,
        provider: providerPDA,
        providerAuthority: providerWallet,
        courseId,
        name: "Solana Development 101",
        description: "Introduction to Solana blockchain development",
        workloadRequired: 100,
        degreeId: null,
      });

      const tx = await sendInstructions(rpcUrl, [instruction], providerWallet);
      console.log("Course created:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify course account
      const courseAccount = await fetchCourse(rpc, coursePDA);
      expect(courseAccount.data.id).to.equal(courseId);
      expect(courseAccount.data.name).to.equal("Solana Development 101");
      expect(courseAccount.data.provider).to.equal(providerWallet.address);
    });

    it("Should add accepted course to hub", async () => {
      const instruction = await getAddAcceptedCourseInstructionAsync({
        hub: hubPDA,
        authority: hubAuthority,
        course: coursePDA,
        courseId,
        providerWallet: providerWallet.address,
      });

      const tx = await sendInstructions(rpcUrl, [instruction], hubAuthority);
      console.log("Course added to hub:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify course was added
      const hubAccount = await fetchHub(rpc, hubPDA);
      expect(hubAccount.data.acceptedCourses).to.have.lengthOf(1);
      expect(hubAccount.data.acceptedCourses[0]).to.equal(courseId);
    });

    it("Should fail to add course from non-accepted provider", async () => {
      // Create a new non-accepted provider
      const newProviderWallet = await generateTestSigner();
      await requestAirdrop(
        rpcUrl,
        newProviderWallet.address,
        1 * LAMPORTS_PER_SOL,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const [newProviderPDA] = await getProviderPDA(newProviderWallet.address);

      // Initialize the new provider
      const initInstruction = await getInitializeProviderInstructionAsync({
        providerAccount: newProviderPDA,
        providerAuthority: newProviderWallet,
        name: "Non-Accepted Provider",
        description: "Test provider",
        website: "https://test.com",
        email: "test@test.com",
        providerType: "education",
      });

      await sendInstructions(rpcUrl, [initInstruction], newProviderWallet);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Create a course from non-accepted provider
      const newCourseId = "TEST123";
      const [newCoursePDA] = await getCoursePDA(newCourseId);

      const createCourseInstruction = await getCreateCourseInstructionAsync({
        course: newCoursePDA,
        provider: newProviderPDA,
        providerAuthority: newProviderWallet,
        courseId: newCourseId,
        name: "Test Course",
        description: "Test description",
        workloadRequired: 50,
        degreeId: null,
      });

      await sendInstructions(
        rpcUrl,
        [createCourseInstruction],
        newProviderWallet,
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Try to add course to hub - should fail
      try {
        const addCourseInstruction = await getAddAcceptedCourseInstructionAsync(
          {
            hub: hubPDA,
            authority: hubAuthority,
            course: newCoursePDA,
            courseId: newCourseId,
            providerWallet: newProviderWallet.address,
          },
        );

        await sendInstructions(rpcUrl, [addCourseInstruction], hubAuthority);
        expect.fail("Should have failed - provider not accepted");
      } catch (error: any) {
        expect(error.toString()).to.include("ProviderNotAccepted");
      }
    });

    it("Should remove accepted course from hub", async () => {
      const instruction = await getRemoveAcceptedCourseInstructionAsync({
        hub: hubPDA,
        authority: hubAuthority,
        courseId,
      });

      const tx = await sendInstructions(rpcUrl, [instruction], hubAuthority);
      console.log("Course removed from hub:", tx);

      // Wait for transaction to confirm
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify course was removed
      const hubAccount = await fetchHub(rpc, hubPDA);
      expect(hubAccount.data.acceptedCourses).to.be.an("array").that.is.empty;
    });
  });
});
