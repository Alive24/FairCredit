import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction 
} from "@solana/web3.js";
import { PROGRAM_ID, getHubPDA, getProviderPDA, getCoursePDA } from "./config";
import { BatchOperation } from "@/hooks/use-batch-registry";

interface WalletAdapter {
  publicKey: PublicKey;
  sendTransaction: (transaction: Transaction, connection: Connection, options?: {
    skipPreflight?: boolean;
    preflightCommitment?: string;
    maxRetries?: number;
  }) => Promise<string>;
}

// Instruction discriminators from the program
const INSTRUCTIONS = {
  ADD_ACCEPTED_PROVIDER: Buffer.from([254, 208, 75, 70, 237, 107, 97, 207]),
  REMOVE_ACCEPTED_PROVIDER: Buffer.from([190, 139, 121, 51, 91, 173, 194, 22]),
  ADD_ACCEPTED_COURSE: Buffer.from([112, 34, 179, 21, 127, 26, 135, 187]),
  REMOVE_ACCEPTED_COURSE: Buffer.from([229, 110, 78, 208, 100, 200, 240, 217]),
  ADD_ACCEPTED_ENDORSER: Buffer.from([0, 23, 132, 187, 42, 28, 234, 190]),
  REMOVE_ACCEPTED_ENDORSER: Buffer.from([22, 73, 184, 227, 224, 207, 6, 23]),
};

export class BatchRegistryManager {
  private connection: Connection;
  private wallet: WalletAdapter;

  constructor(connection: Connection, wallet: WalletAdapter) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Execute all pending operations in a single transaction
   */
  async executeBatchOperations(operations: BatchOperation[]): Promise<string> {
    if (operations.length === 0) {
      throw new Error("No operations to execute");
    }

    const [hubPDA] = getHubPDA();
    const transaction = new Transaction();

    // Create instructions for each operation
    for (const operation of operations) {
      const instruction = await this.createInstructionForOperation(
        operation, 
        hubPDA
      );
      transaction.add(instruction);
    }

    // Set transaction parameters
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.wallet.publicKey;

    // Send transaction
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
  }

  /**
   * Create instruction for a single operation
   */
  private async createInstructionForOperation(
    operation: BatchOperation,
    hubPDA: PublicKey
  ): Promise<TransactionInstruction> {
    const { type, entityType, entityKey } = operation;

    switch (entityType) {
      case "provider":
        return this.createProviderInstruction(type, entityKey, hubPDA);
      
      case "course":
        return this.createCourseInstruction(type, entityKey, hubPDA);
      
      case "endorser":
        return this.createEndorserInstruction(type, entityKey, hubPDA);
      
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  private createProviderInstruction(
    type: "add" | "remove",
    providerKey: string,
    hubPDA: PublicKey
  ): TransactionInstruction {
    const providerWallet = new PublicKey(providerKey);
    const [providerPDA] = getProviderPDA(providerWallet);

    if (type === "add") {
      return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: providerPDA, isSigner: false, isWritable: false },
          { pubkey: providerWallet, isSigner: false, isWritable: false },
        ],
        data: INSTRUCTIONS.ADD_ACCEPTED_PROVIDER,
      });
    } else {
      return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: providerWallet, isSigner: false, isWritable: false },
        ],
        data: INSTRUCTIONS.REMOVE_ACCEPTED_PROVIDER,
      });
    }
  }

  private createCourseInstruction(
    type: "add" | "remove",
    courseId: string,
    hubPDA: PublicKey
  ): TransactionInstruction {
    const courseIdBuffer = Buffer.alloc(32);
    courseIdBuffer.write(courseId);

    if (type === "add") {
      const [coursePDA] = getCoursePDA(courseId);
      return new TransactionInstruction({
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
    } else {
      return new TransactionInstruction({
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
    }
  }

  private createEndorserInstruction(
    type: "add" | "remove",
    endorserKey: string,
    hubPDA: PublicKey
  ): TransactionInstruction {
    const endorserWallet = new PublicKey(endorserKey);

    if (type === "add") {
      return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: endorserWallet, isSigner: false, isWritable: false },
        ],
        data: INSTRUCTIONS.ADD_ACCEPTED_ENDORSER,
      });
    } else {
      return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: hubPDA, isSigner: false, isWritable: true },
          { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
          { pubkey: endorserWallet, isSigner: false, isWritable: false },
        ],
        data: INSTRUCTIONS.REMOVE_ACCEPTED_ENDORSER,
      });
    }
  }

  /**
   * Estimate transaction costs and compute units
   */
  async estimateBatchCost(operations: BatchOperation[]): Promise<{
    estimatedFee: number;
    computeUnits: number;
    instructionCount: number;
  }> {
    const instructionCount = operations.length;
    
    // Rough estimates - each instruction uses ~10k compute units
    const computeUnits = instructionCount * 10000;
    
    // Get current fee rate (5000 lamports per signature is typical)
    const recentBlockhash = await this.connection.getLatestBlockhash();
    const feeCalculator = await this.connection.getFeeForMessage(
      new Transaction().compileMessage(),
      'confirmed'
    );
    
    const estimatedFee = feeCalculator?.value || 5000;

    return {
      estimatedFee,
      computeUnits,
      instructionCount
    };
  }
}