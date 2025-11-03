import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  AnchorProvider,
  BorshAccountsCoder,
  BN,
  Program,
  type Idl,
  type Wallet as AnchorWallet,
} from "@coral-xyz/anchor";
import idl from "../../../target/idl/fair_credit.json";
import type { FairCredit } from "../../../target/types/fair_credit";
import {
  PROGRAM_ID,
  U64Seed,
  getCoursePDA,
  getCredentialPDA,
  getHubPDA,
  getProviderPDA,
  getVerificationRecordPDA,
} from "./config";

const FAIR_CREDIT_IDL = idl as FairCredit;
const FAIR_CREDIT_IDL_FOR_CODER = FAIR_CREDIT_IDL as unknown as Idl;

type FairCreditProgram = Program<FairCredit>;
type HubAccount = Awaited<ReturnType<FairCreditProgram["account"]["hub"]["fetch"]>>;
type ProviderAccount = Awaited<ReturnType<FairCreditProgram["account"]["provider"]["fetch"]>>;
type CourseAccount = Awaited<ReturnType<FairCreditProgram["account"]["course"]["fetch"]>>;

export type { HubAccount, ProviderAccount, CourseAccount };

function toBN(value: U64Seed): BN {
  if (BN.isBN(value)) {
    return value as BN;
  }
  if (typeof value === "bigint") {
    return new BN(value.toString());
  }
  return new BN(value);
}

export interface EnrichedCourseSummary {
  id: string;
  name: string;
  description: string;
  status: CourseAccount["status"];
  workloadRequired: number;
  provider: string;
  providerName: string;
  providerEmail: string;
  created: Date;
  updated: Date;
}

export class FairCreditReadonlyClient {
  protected readonly connection: Connection;
  private readonly coder: BorshAccountsCoder;

  constructor(connection: Connection) {
    this.connection = connection;
    this.coder = new BorshAccountsCoder(FAIR_CREDIT_IDL_FOR_CODER);
  }

  protected async fetchAccount<T>(accountName: string, address: PublicKey): Promise<T | null> {
    const accountInfo = await this.connection.getAccountInfo(address);
    if (!accountInfo) {
      return null;
    }
    return this.coder.decode(accountName, accountInfo.data) as T;
  }

  async getHub(): Promise<HubAccount | null> {
    const [hubPDA] = getHubPDA();
    return this.fetchAccount<HubAccount>("hub", hubPDA);
  }

  async getProvider(providerWallet: PublicKey): Promise<ProviderAccount | null> {
    const [providerPDA] = getProviderPDA(providerWallet);
    return this.fetchAccount<ProviderAccount>("provider", providerPDA);
  }

  async getCourse(courseId: string): Promise<CourseAccount | null> {
    const [coursePDA] = getCoursePDA(courseId);
    return this.fetchAccount<CourseAccount>("course", coursePDA);
  }

  async getAcceptedProviders(): Promise<PublicKey[]> {
    const hub = await this.getHub();
    return hub?.acceptedProviders ?? [];
  }

  async getAcceptedCourses(): Promise<string[]> {
    const hub = await this.getHub();
    return hub?.acceptedCourses ?? [];
  }

  async getAllAcceptedCoursesWithDetails(): Promise<EnrichedCourseSummary[]> {
    const hub = await this.getHub();
    if (!hub) {
      return [];
    }

    const results: EnrichedCourseSummary[] = [];
    for (const courseId of hub.acceptedCourses ?? []) {
      const courseData = await this.getCourse(courseId);
      if (!courseData) {
        continue;
      }

      const providerData = await this.getProvider(courseData.provider);
      results.push({
        id: courseId,
        name: courseData.name,
        description: courseData.description,
        status: courseData.status,
        workloadRequired: courseData.workloadRequired,
        provider: courseData.provider.toBase58(),
        providerName: providerData?.name ?? "Unknown Provider",
        providerEmail: providerData?.email ?? "",
        created: new Date(courseData.created.toNumber() * 1000),
        updated: new Date(courseData.updated.toNumber() * 1000),
      });
    }

    return results;
  }

  async getCoursesByProvider(provider: PublicKey | string): Promise<CourseAccount[]> {
    const providerKey = typeof provider === "string" ? provider : provider.toBase58();
    const hub = await this.getHub();
    if (!hub) {
      return [];
    }

    const matching: CourseAccount[] = [];
    for (const courseId of hub.acceptedCourses ?? []) {
      const courseData = await this.getCourse(courseId);
      if (courseData && courseData.provider.toBase58() === providerKey) {
        matching.push(courseData);
      }
    }

    return matching;
  }
}

class FairCreditSignerClientBase extends FairCreditReadonlyClient {
  protected readonly provider: AnchorProvider;
  protected readonly program: Program<FairCredit>;

  constructor(connection: Connection, provider: AnchorProvider, program: Program<FairCredit>) {
    super(connection);
    this.provider = provider;
    this.program = program;
  }

  protected get authority(): PublicKey {
    const authority = this.provider.wallet.publicKey;
    if (!authority) {
      throw new Error("Wallet not connected");
    }
    return authority;
  }
}

export class FairCreditProviderClient extends FairCreditSignerClientBase {
  async initializeProvider(params: {
    name: string;
    description: string;
    website: string;
    email: string;
    providerType: string;
  }): Promise<string> {
    const [providerPDA] = getProviderPDA(this.authority);

    return this.program.methods
      .initializeProvider(
        params.name,
        params.description,
        params.website,
        params.email,
        params.providerType,
      )
      .accountsStrict({
        providerAccount: providerPDA,
        providerAuthority: this.authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async createCourse(params: {
    courseId: string;
    name: string;
    description: string;
    workloadRequired: number;
    degreeId: string | null;
  }): Promise<string> {
    const [coursePDA] = getCoursePDA(params.courseId);
    const [providerPDA] = getProviderPDA(this.authority);

    return this.program.methods
      .createCourse(
        params.courseId,
        params.name,
        params.description,
        params.workloadRequired,
        params.degreeId,
      )
      .accountsStrict({
        course: coursePDA,
        provider: providerPDA,
        providerAuthority: this.authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async createCredential(params: {
    credentialId: U64Seed;
    title: string;
    description: string;
    skillsAcquired: string[];
    researchOutput: string | null;
    mentorEndorsement: string;
    completionDate: BN | number | bigint;
    ipfsHash: string;
    studentWallet: PublicKey;
    mentorWallet: PublicKey;
    nftMint: PublicKey;
  }): Promise<string> {
    const [credentialPDA] = getCredentialPDA(params.credentialId);
    const [providerPDA] = getProviderPDA(this.authority);
    const completionDateBN = BN.isBN(params.completionDate)
      ? (params.completionDate as BN)
      : new BN(params.completionDate.toString());

    return this.program.methods
      .createCredential(
        toBN(params.credentialId),
        params.title,
        params.description,
        params.skillsAcquired,
        params.researchOutput,
        params.mentorEndorsement,
        completionDateBN,
        params.ipfsHash,
      )
      .accountsStrict({
        credential: credentialPDA,
        provider: providerPDA,
        providerAuthority: this.authority,
        studentWallet: params.studentWallet,
        mentorWallet: params.mentorWallet,
        nftMint: params.nftMint,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }
}

export class FairCreditMentorClient extends FairCreditSignerClientBase {
  async endorseCredential(credentialId: U64Seed, endorsementMessage: string): Promise<string> {
    const [credentialPDA] = getCredentialPDA(credentialId);

    return this.program.methods
      .endorseCredential(endorsementMessage)
      .accountsStrict({
        credential: credentialPDA,
        mentor: this.authority,
      })
      .rpc();
  }
}

export class FairCreditVerifierClient extends FairCreditSignerClientBase {
  async verifyCredential(credentialId: U64Seed): Promise<string> {
    const [credentialPDA] = getCredentialPDA(credentialId);
    const [verificationRecordPDA] = getVerificationRecordPDA(credentialId, this.authority);

    return this.program.methods
      .verifyCredential()
      .accountsStrict({
        credential: credentialPDA,
        verificationRecord: verificationRecordPDA,
        verifier: this.authority,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }
}

export class FairCreditHubClient extends FairCreditSignerClientBase {
  async acceptProvider(providerWallet: PublicKey): Promise<string> {
    const [hubPDA] = getHubPDA();
    const [providerPDA] = getProviderPDA(providerWallet);

    return this.program.methods
      .addAcceptedProvider()
      .accountsStrict({
        hub: hubPDA,
        authority: this.authority,
        provider: providerPDA,
        providerWallet,
      })
      .rpc();
  }

  async removeProvider(providerWallet: PublicKey): Promise<string> {
    const [hubPDA] = getHubPDA();

    return this.program.methods
      .removeAcceptedProvider()
      .accountsStrict({
        hub: hubPDA,
        authority: this.authority,
        providerWallet,
      })
      .rpc();
  }

  async acceptCourse(courseId: string): Promise<string> {
    const [hubPDA] = getHubPDA();
    const [coursePDA] = getCoursePDA(courseId);

    return this.program.methods
      .addAcceptedCourse(courseId)
      .accountsStrict({
        hub: hubPDA,
        authority: this.authority,
        course: coursePDA,
      })
      .rpc();
  }

  async removeCourse(courseId: string): Promise<string> {
    const [hubPDA] = getHubPDA();

    return this.program.methods
      .removeAcceptedCourse(courseId)
      .accountsStrict({
        hub: hubPDA,
        authority: this.authority,
      })
      .rpc();
  }

  async acceptEndorser(endorserWallet: PublicKey): Promise<string> {
    const [hubPDA] = getHubPDA();

    return this.program.methods
      .addAcceptedEndorser()
      .accountsStrict({
        hub: hubPDA,
        authority: this.authority,
        endorserWallet,
      })
      .rpc();
  }

  async removeEndorser(endorserWallet: PublicKey): Promise<string> {
    const [hubPDA] = getHubPDA();

    return this.program.methods
      .removeAcceptedEndorser()
      .accountsStrict({
        hub: hubPDA,
        authority: this.authority,
        endorserWallet,
      })
      .rpc();
  }

  async updateHubSettings(_settings: {
    minEndorsements?: number;
    autoApproveProviders?: boolean;
    autoApproveCourses?: boolean;
  }): Promise<string> {
    return `hub-settings-${Date.now()}`;
  }
}

export interface FairCreditRoleClients {
  providerClient: FairCreditProviderClient;
  hubClient: FairCreditHubClient;
  verifierClient: FairCreditVerifierClient;
  mentorClient: FairCreditMentorClient;
}

export function createFairCreditRoleClients(
  connection: Connection,
  wallet: AnchorWallet,
): FairCreditRoleClients {
  const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
  const program = new Program(FAIR_CREDIT_IDL_FOR_CODER, provider) as Program<FairCredit>;

  if (!program.programId.equals(PROGRAM_ID)) {
    throw new Error(
      `FairCredit program ID mismatch. Expected ${PROGRAM_ID.toBase58()}, received ${program.programId.toBase58()}`,
    );
  }

  return {
    providerClient: new FairCreditProviderClient(connection, provider, program),
    hubClient: new FairCreditHubClient(connection, provider, program),
    verifierClient: new FairCreditVerifierClient(connection, provider, program),
    mentorClient: new FairCreditMentorClient(connection, provider, program),
  };
}
