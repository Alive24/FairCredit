import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram, ComputeBudgetProgram } from "@solana/web3.js";
import { PROGRAM_ID, getProviderPDA } from "./config";

export class SimpleProviderClient {
  private connection: Connection;
  private wallet: any;

  constructor(connection: Connection, wallet: any) {
    this.connection = connection;
    this.wallet = wallet;
  }

  async initializeProvider(
    name: string,
    description: string,
    website: string,
    email: string,
    providerType: string
  ): Promise<string> {
    try {
      if (!this.wallet.publicKey) {
        throw new Error("Wallet not connected");
      }

      console.log("🔧 SimpleProviderClient - Starting initialization");
      console.log("🔧 Wallet state:", {
        publicKey: this.wallet.publicKey.toBase58(),
        connected: this.wallet.connected,
        adapter: this.wallet.wallet?.adapter?.name
      });

      const [providerPDA] = getProviderPDA(this.wallet.publicKey);
      console.log("🔧 Provider PDA:", providerPDA.toBase58());
      console.log("🔧 Program ID:", PROGRAM_ID.toBase58());

      // Check if program exists
      try {
        const programInfo = await this.connection.getAccountInfo(PROGRAM_ID);
        console.log("🔧 Program account info:", {
          exists: !!programInfo,
          owner: programInfo?.owner?.toBase58(),
          executable: programInfo?.executable,
          lamports: programInfo?.lamports
        });
      } catch (e) {
        console.error("❌ Failed to fetch program info:", e);
      }

      // Check if provider account already exists
      try {
        const providerAccountInfo = await this.connection.getAccountInfo(providerPDA);
        console.log("🔧 Provider account info:", {
          exists: !!providerAccountInfo,
          owner: providerAccountInfo?.owner?.toBase58(),
          lamports: providerAccountInfo?.lamports,
          dataLength: providerAccountInfo?.data?.length
        });
        
        if (providerAccountInfo) {
          console.warn("⚠️ Provider account already exists!");
          throw new Error("Provider account already exists for this wallet");
        }
      } catch (e) {
        if (e instanceof Error && e.message.includes("already exists")) {
          throw e;
        }
        console.log("✅ Provider account does not exist yet (good)");
      }

      // Check wallet balance
      try {
        const balance = await this.connection.getBalance(this.wallet.publicKey);
        console.log("🔧 Wallet balance:", balance / 1e9, "SOL");
        if (balance < 0.01 * 1e9) {
          console.warn("⚠️ Low balance - might not have enough for rent and fees");
        }
      } catch (e) {
        console.error("❌ Failed to fetch balance:", e);
      }

      // Create a simple test transaction first
      const testTransaction = new Transaction();
      
      // Add compute budget instruction
      testTransaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 200000
        })
      );

      // Build the actual instruction
      const instruction = await this.buildInstruction(
        providerPDA,
        name,
        description,
        website,
        email,
        providerType
      );
      
      console.log("🔧 Instruction details:", {
        programId: instruction.programId.toBase58(),
        keys: instruction.keys.map(k => ({
          pubkey: k.pubkey.toBase58(),
          isSigner: k.isSigner,
          isWritable: k.isWritable
        })),
        dataLength: instruction.data.length,
        dataHex: instruction.data.toString('hex').slice(0, 100) + '...'
      });
      
      testTransaction.add(instruction);

      // Set transaction properties
      const { blockhash } = await this.connection.getLatestBlockhash();
      testTransaction.recentBlockhash = blockhash;
      testTransaction.feePayer = this.wallet.publicKey;

      console.log("🔧 Sending transaction...");
      console.log("🔧 Transaction details:", {
        instructionCount: testTransaction.instructions.length,
        feePayer: testTransaction.feePayer?.toBase58(),
        blockhash: testTransaction.recentBlockhash
      });
      
      // First simulate the transaction
      try {
        console.log("🔧 Simulating transaction...");
        const simulation = await this.connection.simulateTransaction(testTransaction);
        console.log("🔧 Simulation result:", {
          error: simulation.value.err,
          logs: simulation.value.logs,
          unitsConsumed: simulation.value.unitsConsumed
        });
        
        if (simulation.value.err) {
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
      } catch (simError) {
        console.error("❌ Simulation error:", simError);
        // Continue anyway to see the actual error
      }
      
      // Try to send transaction with different options
      try {
        const signature = await this.wallet.sendTransaction(testTransaction, this.connection, {
          skipPreflight: false,
          preflightCommitment: "processed"
        });

        console.log("✅ Transaction sent:", signature);

        // Wait for confirmation
        const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
        console.log("✅ Transaction confirmed:", confirmation);

        return signature;
      } catch (sendError: any) {
        console.error("❌ Send transaction error details:", {
          name: sendError?.name,
          message: sendError?.message,
          logs: sendError?.logs,
          error: sendError
        });
        
        // Try alternative method
        console.log("🔧 Trying alternative transaction method...");
        try {
          if (this.wallet.signTransaction) {
            console.log("🔧 Signing transaction...");
            const signed = await this.wallet.signTransaction(testTransaction);
            console.log("🔧 Transaction signed, serializing...");
            const serialized = signed.serialize();
            console.log("🔧 Transaction serialized, size:", serialized.length);
            
            const signature = await this.connection.sendRawTransaction(serialized);
            console.log("✅ Alternative method - Transaction sent:", signature);
            
            await this.connection.confirmTransaction(signature, "confirmed");
            return signature;
          } else {
            console.log("❌ Wallet doesn't support signTransaction");
          }
        } catch (altError) {
          console.error("❌ Alternative method also failed:", altError);
        }
        
        throw sendError;
      }
    } catch (error) {
      console.error("❌ SimpleProviderClient error:", error);
      throw error;
    }
  }

  private async buildInstruction(
    providerPDA: PublicKey,
    name: string,
    description: string,
    website: string,
    email: string,
    providerType: string
  ): Promise<TransactionInstruction> {
    // Initialize provider discriminator from IDL
    const discriminator = Buffer.from([181, 103, 225, 14, 214, 210, 161, 238]);
    
    // Encode parameters
    const nameBuffer = this.encodeString(name);
    const descBuffer = this.encodeString(description);
    const websiteBuffer = this.encodeString(website);
    const emailBuffer = this.encodeString(email);
    const typeBuffer = this.encodeString(providerType);

    const data = Buffer.concat([
      discriminator,
      nameBuffer,
      descBuffer,
      websiteBuffer,
      emailBuffer,
      typeBuffer
    ]);

    return new TransactionInstruction({
      keys: [
        { pubkey: providerPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: PROGRAM_ID,
      data
    });
  }

  private encodeString(str: string): Buffer {
    const bytes = Buffer.from(str, "utf8");
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32LE(bytes.length, 0);
    return Buffer.concat([length, bytes]);
  }
}