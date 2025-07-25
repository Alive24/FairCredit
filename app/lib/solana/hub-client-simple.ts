import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import { PROGRAM_ID, getHubPDA, getCoursePDA, getProviderPDA } from "./config";
import { decodeHubAccount, HubAccount } from "./hub-decoder";

// Instruction discriminators from IDL
const INSTRUCTIONS = {
  ADD_ACCEPTED_PROVIDER: Buffer.from([254, 208, 75, 70, 237, 107, 97, 207]),
  REMOVE_ACCEPTED_PROVIDER: Buffer.from([190, 139, 121, 51, 91, 173, 194, 22]),
  ADD_ACCEPTED_COURSE: Buffer.from([112, 34, 179, 21, 127, 26, 135, 187]),
  REMOVE_ACCEPTED_COURSE: Buffer.from([229, 110, 78, 208, 100, 200, 240, 217]),
  ADD_ACCEPTED_ENDORSER: Buffer.from([0, 23, 132, 187, 42, 28, 234, 190]),
  REMOVE_ACCEPTED_ENDORSER: Buffer.from([22, 73, 184, 227, 224, 207, 6, 23]),
};

export class HubManagementClient {
  private connection: Connection;
  private wallet: any;

  constructor(connection: Connection, wallet: any) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Fetch and decode Hub account data
   */
  async getHub(): Promise<HubAccount | null> {
    try {
      const [hubPDA] = getHubPDA();
      const accountInfo = await this.connection.getAccountInfo(hubPDA);
      
      if (!accountInfo) {
        console.log("Hub account not found");
        return null;
      }

      // Decode the actual hub data from the blockchain
      return decodeHubAccount(accountInfo.data);
    } catch (error) {
      console.error("Error fetching hub:", error);
      return null;
    }
  }

  /**
   * Accept a new provider
   */
  async acceptProvider(providerWallet: PublicKey): Promise<string> {
    try {
      const [hubPDA] = getHubPDA();
      const [providerPDA] = getProviderPDA(providerWallet);

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false }, // authority
          { pubkey: providerPDA, isSigner: false, isWritable: false }, // provider PDA
          { pubkey: providerWallet, isSigner: false, isWritable: false }, // provider_wallet
        ],
        data: INSTRUCTIONS.ADD_ACCEPTED_PROVIDER,
      });

      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      // Use the wallet adapter's sendTransaction method with options
      const signature = await this.wallet.sendTransaction(transaction, this.connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
        maxRetries: 3,
      });
      
      // Wait for confirmation
      await this.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      return signature;
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

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: providerWallet, isSigner: false, isWritable: false },
        ],
        data: INSTRUCTIONS.REMOVE_ACCEPTED_PROVIDER,
      });

      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      const signature = await this.wallet.sendTransaction(transaction, this.connection);
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
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

      // Course ID needs to be serialized properly
      const courseIdBuffer = Buffer.alloc(32);
      courseIdBuffer.write(courseId);

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: coursePDA, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          INSTRUCTIONS.ADD_ACCEPTED_COURSE,
          courseIdBuffer
        ]),
      });

      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      const signature = await this.wallet.sendTransaction(transaction, this.connection);
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
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

      // Course ID needs to be serialized properly
      const courseIdBuffer = Buffer.alloc(32);
      courseIdBuffer.write(courseId);

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
        ],
        data: Buffer.concat([
          INSTRUCTIONS.REMOVE_ACCEPTED_COURSE,
          courseIdBuffer
        ]),
      });

      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      const signature = await this.wallet.sendTransaction(transaction, this.connection);
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
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

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: endorserWallet, isSigner: false, isWritable: false },
        ],
        data: INSTRUCTIONS.ADD_ACCEPTED_ENDORSER,
      });

      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      const signature = await this.wallet.sendTransaction(transaction, this.connection);
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
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

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: endorserWallet, isSigner: false, isWritable: false },
        ],
        data: INSTRUCTIONS.REMOVE_ACCEPTED_ENDORSER,
      });

      const transaction = new Transaction().add(instruction);
      
      // Get recent blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;
      
      const signature = await this.wallet.sendTransaction(transaction, this.connection);
      
      await this.connection.confirmTransaction(signature, 'confirmed');
      
      return signature;
    } catch (error) {
      console.error("Error removing endorser:", error);
      throw error;
    }
  }

  /**
   * Update hub settings (this is a placeholder - would need actual instruction in program)
   */
  async updateHubSettings(settings: {
    minEndorsements?: number;
    autoApproveProviders?: boolean;
    autoApproveCourses?: boolean;
  }): Promise<string> {
    try {
      console.log("Updating hub settings:", settings);
      
      // This would require a specific instruction in your program
      // For now, we'll return a mock transaction ID
      return "simulated-tx-" + Date.now();
    } catch (error) {
      console.error("Error updating hub settings:", error);
      throw error;
    }
  }

}