import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { PROGRAM_ID, getHubPDA, getCoursePDA, getProviderPDA } from "./config";
import IDL from "../../../target/idl/fair_credit.json";

// Convert string arrays to proper data types
const IDL_TYPED = IDL as any;

export class HubManagementClient {
  private program: Program;
  private connection: Connection;

  constructor(connection: Connection, wallet: any) {
    const provider = new AnchorProvider(
      connection,
      wallet,
      { commitment: "confirmed" }
    );
    this.program = new Program(IDL_TYPED, provider);
    this.connection = connection;
  }

  /**
   * Accept a new provider
   */
  async acceptProvider(providerWallet: PublicKey): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();
      const [providerPDA] = getProviderPDA(providerWallet);

      const tx = await this.program.methods
        .addAcceptedProvider()
        .accounts({
          hub: hubPDA,
          authority: this.program.provider.publicKey,
          provider: providerPDA,
          providerWallet: providerWallet,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error accepting provider:", error);
      throw error;
    }
  }

  /**
   * Remove an accepted provider
   */
  async removeProvider(providerWallet: PublicKey): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();

      const tx = await this.program.methods
        .removeAcceptedProvider()
        .accounts({
          hub: hubPDA,
          authority: this.program.provider.publicKey,
          providerWallet: providerWallet,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error removing provider:", error);
      throw error;
    }
  }

  /**
   * Accept a new course
   */
  async acceptCourse(courseId: string): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();
      const [coursePDA] = getCoursePDA(courseId);

      const tx = await this.program.methods
        .addAcceptedCourse(courseId)
        .accounts({
          hub: hubPDA,
          authority: this.program.provider.publicKey,
          course: coursePDA,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error accepting course:", error);
      throw error;
    }
  }

  /**
   * Remove an accepted course
   */
  async removeCourse(courseId: string): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();

      const tx = await this.program.methods
        .removeAcceptedCourse(courseId)
        .accounts({
          hub: hubPDA,
          authority: this.program.provider.publicKey,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error removing course:", error);
      throw error;
    }
  }

  /**
   * Accept a new endorser
   */
  async acceptEndorser(endorserWallet: PublicKey): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();

      const tx = await this.program.methods
        .addAcceptedEndorser()
        .accounts({
          hub: hubPDA,
          authority: this.program.provider.publicKey,
          endorserWallet: endorserWallet,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error accepting endorser:", error);
      throw error;
    }
  }

  /**
   * Remove an accepted endorser
   */
  async removeEndorser(endorserWallet: PublicKey): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();

      const tx = await this.program.methods
        .removeAcceptedEndorser()
        .accounts({
          hub: hubPDA,
          authority: this.program.provider.publicKey,
          endorserWallet: endorserWallet,
        })
        .rpc();

      return tx;
    } catch (error) {
      console.error("Error removing endorser:", error);
      throw error;
    }
  }

  /**
   * Update hub settings (requires custom instruction)
   */
  async updateHubSettings(settings: {
    minEndorsements?: number;
    autoApproveProviders?: boolean;
    autoApproveCourses?: boolean;
  }): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();

      // Note: This would require a custom instruction in your program
      // For now, we'll simulate it
      console.log("Updating hub settings:", settings);
      
      // Simulate transaction
      return "simulated-tx-" + Date.now();
    } catch (error) {
      console.error("Error updating hub settings:", error);
      throw error;
    }
  }

  /**
   * Get hub data with proper decoding
   */
  async getHub(): Promise<any> {
    try {
      const [hubPDA] = getHubPDA();
      const hub = await this.program.account.hub.fetch(hubPDA);
      return hub;
    } catch (error) {
      console.error("Error fetching hub:", error);
      throw error;
    }
  }

  /**
   * Get provider data
   */
  async getProvider(providerWallet: PublicKey): Promise<any> {
    try {
      const [providerPDA] = getProviderPDA(providerWallet);
      const provider = await this.program.account.provider.fetch(providerPDA);
      return provider;
    } catch (error) {
      console.error("Error fetching provider:", error);
      throw error;
    }
  }

  /**
   * Get course data
   */
  async getCourse(courseId: string): Promise<any> {
    try {
      const [coursePDA] = getCoursePDA(courseId);
      const course = await this.program.account.course.fetch(coursePDA);
      return course;
    } catch (error) {
      console.error("Error fetching course:", error);
      throw error;
    }
  }
}