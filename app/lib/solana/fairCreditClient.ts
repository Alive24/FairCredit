import { Connection, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import { FairCredit } from "../../../target/types/fair_credit";
import idl from "../../../target/idl/fair_credit.json";
import { PROGRAM_ID, getProviderPDA, getCoursePDA, getHubPDA } from "./config";

export class FairCreditClient {
  private connection: Connection;
  private program: Program<FairCredit>;
  private provider: AnchorProvider;

  constructor(
    connection: Connection,
    wallet: any // Wallet adapter
  ) {
    this.connection = connection;
    
    // Create provider
    this.provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: "confirmed" }
    );
    setProvider(this.provider);

    // Initialize program
    this.program = new Program(idl as Idl, PROGRAM_ID, this.provider) as Program<FairCredit>;
  }

  /**
   * Get the Hub account data
   */
  async getHub() {
    const [hubPDA] = getHubPDA();
    try {
      return await this.program.account.hub.fetch(hubPDA);
    } catch (error) {
      console.error("Failed to fetch hub:", error);
      return null;
    }
  }

  /**
   * Get all accepted providers from the Hub
   */
  async getAcceptedProviders(): Promise<PublicKey[]> {
    const hub = await this.getHub();
    return hub?.acceptedProviders || [];
  }

  /**
   * Get all accepted courses from the Hub
   */
  async getAcceptedCourses(): Promise<string[]> {
    const hub = await this.getHub();
    return hub?.acceptedCourses || [];
  }

  /**
   * Get provider details
   */
  async getProvider(providerWallet: PublicKey) {
    const [providerPDA] = getProviderPDA(providerWallet);
    try {
      return await this.program.account.provider.fetch(providerPDA);
    } catch (error) {
      console.error("Failed to fetch provider:", error);
      return null;
    }
  }

  /**
   * Get course details
   */
  async getCourse(courseId: string) {
    const [coursePDA] = getCoursePDA(courseId);
    try {
      return await this.program.account.course.fetch(coursePDA);
    } catch (error) {
      console.error("Failed to fetch course:", error);
      return null;
    }
  }

  /**
   * Get all courses from accepted providers with details
   */
  async getAllAcceptedCoursesWithDetails() {
    const acceptedCourseIds = await this.getAcceptedCourses();
    const courses = [];
    
    for (const courseId of acceptedCourseIds) {
      try {
        const courseData = await this.getCourse(courseId);
        if (courseData) {
          // Get provider details
          const providerData = await this.getProvider(courseData.provider);
          
          courses.push({
            id: courseId,
            name: courseData.name,
            description: courseData.description,
            status: courseData.status,
            workloadRequired: courseData.workloadRequired,
            provider: courseData.provider.toString(),
            providerName: providerData?.name || "Unknown Provider",
            providerEmail: providerData?.email || "",
            created: new Date(courseData.created.toNumber() * 1000),
            updated: new Date(courseData.updated.toNumber() * 1000),
          });
        }
      } catch (error) {
        console.error(`Failed to fetch course ${courseId}:`, error);
      }
    }
    
    return courses;
  }

  /**
   * Check if a provider is accepted by the Hub
   */
  async isProviderAccepted(providerWallet: PublicKey): Promise<boolean> {
    const acceptedProviders = await this.getAcceptedProviders();
    return acceptedProviders.some(p => p.equals(providerWallet));
  }

  /**
   * Check if a course is accepted by the Hub
   */
  async isCourseAccepted(courseId: string): Promise<boolean> {
    const acceptedCourses = await this.getAcceptedCourses();
    return acceptedCourses.includes(courseId);
  }

  /**
   * Initialize a new provider (requires signing)
   */
  async initializeProvider(
    name: string,
    description: string,
    website: string,
    email: string,
    providerType: string
  ) {
    return await this.program.methods
      .initializeProvider(name, description, website, email, providerType)
      .accounts({
        providerAuthority: this.provider.wallet.publicKey,
      })
      .rpc();
  }

  /**
   * Create a new course (requires provider authority)
   */
  async createCourse(
    courseId: string,
    name: string,
    description: string,
    workloadRequired: number,
    degreeId: string | null
  ) {
    return await this.program.methods
      .createCourse(courseId, name, description, workloadRequired, degreeId)
      .accounts({
        providerAuthority: this.provider.wallet.publicKey,
      })
      .rpc();
  }
}