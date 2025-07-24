import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Idl, setProvider } from "@coral-xyz/anchor";
import * as anchor from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import idl from "../target/idl/fair_credit.json";
import * as fs from "fs";
import * as path from "path";

/**
 * FairCredit DApp Integration Helper
 * 
 * This class provides easy-to-use methods for integrating with the FairCredit program
 * from a web application.
 */
export class FairCreditClient {
  private connection: Connection;
  private program: Program<FairCredit>;
  private provider: AnchorProvider;

  constructor(
    connection: Connection,
    wallet: any, // Can be any wallet adapter (Phantom, Solflare, etc.)
    programId?: PublicKey
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
    const deploymentInfo = FairCreditClient.getDeploymentInfo();
    const pid = programId || new PublicKey(deploymentInfo.programId);
    this.program = new Program(idl as Idl, pid, this.provider) as Program<FairCredit>;
  }

  /**
   * Get the Hub account data
   */
  async getHub(): Promise<any> {
    const hubPDA = this.getHubPDA();
    return await this.program.account.hub.fetch(hubPDA);
  }

  /**
   * Get all accepted providers from the Hub
   */
  async getAcceptedProviders(): Promise<PublicKey[]> {
    const hub = await this.getHub();
    return hub.acceptedProviders;
  }

  /**
   * Get all accepted courses from the Hub
   */
  async getAcceptedCourses(): Promise<string[]> {
    const hub = await this.getHub();
    return hub.acceptedCourses;
  }

  /**
   * Get provider details
   */
  async getProvider(providerWallet: PublicKey): Promise<any> {
    const [providerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), providerWallet.toBuffer()],
      this.program.programId
    );
    return await this.program.account.provider.fetch(providerPDA);
  }

  /**
   * Get course details
   */
  async getCourse(courseId: string): Promise<any> {
    const [coursePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("course"), Buffer.from(courseId)],
      this.program.programId
    );
    return await this.program.account.course.fetch(coursePDA);
  }

  /**
   * Get all courses from accepted providers
   */
  async getAllAcceptedCourses(): Promise<any[]> {
    const acceptedCourseIds = await this.getAcceptedCourses();
    const courses = [];
    
    for (const courseId of acceptedCourseIds) {
      try {
        const course = await this.getCourse(courseId);
        courses.push({
          id: courseId,
          ...course,
        });
      } catch (error) {
        console.error(`Failed to fetch course ${courseId}:`, error);
      }
    }
    
    return courses;
  }

  /**
   * Create a new credential (for providers)
   */
  async createCredential(
    credentialId: number,
    title: string,
    description: string,
    skillsAcquired: string[],
    studentWallet: PublicKey,
    mentorWallet: PublicKey,
    ipfsHash: string
  ) {
    const [credentialPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("credential"), Buffer.from(credentialId.toString())],
      this.program.programId
    );

    const [providerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), this.provider.wallet.publicKey.toBuffer()],
      this.program.programId
    );

    const nftMint = Keypair.generate();

    return await this.program.methods
      .createCredential(
        credentialId,
        title,
        description,
        skillsAcquired,
        null, // research output
        "Pending mentor endorsement",
        Math.floor(Date.now() / 1000),
        ipfsHash
      )
      .accounts({
        credential: credentialPDA,
        provider: providerPDA,
        providerAuthority: this.provider.wallet.publicKey,
        studentWallet,
        mentorWallet,
        nftMint: nftMint.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Helper method to get Hub PDA
   */
  private getHubPDA(): PublicKey {
    const [hubPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("hub")],
      this.program.programId
    );
    return hubPDA;
  }

  /**
   * Get deployment information
   */
  static getDeploymentInfo() {
    try {
      const deploymentPath = path.join(__dirname, "../deployment.json");
      const deploymentData = fs.readFileSync(deploymentPath, "utf-8");
      return JSON.parse(deploymentData);
    } catch (error) {
      console.warn("deployment.json not found, using default program ID");
      return {
        programId: "BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk"
      };
    }
  }
}

/**
 * Example usage in a React component:
 * 
 * ```tsx
 * import { useWallet, useConnection } from '@solana/wallet-adapter-react';
 * import { FairCreditClient } from './fairCreditClient';
 * 
 * function MyComponent() {
 *   const wallet = useWallet();
 *   const { connection } = useConnection();
 *   const [courses, setCourses] = useState([]);
 * 
 *   useEffect(() => {
 *     if (wallet.connected) {
 *       const client = new FairCreditClient(connection, wallet);
 *       client.getAllAcceptedCourses().then(setCourses);
 *     }
 *   }, [wallet.connected]);
 * 
 *   return (
 *     <div>
 *       {courses.map(course => (
 *         <div key={course.id}>
 *           <h3>{course.name}</h3>
 *           <p>{course.description}</p>
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */