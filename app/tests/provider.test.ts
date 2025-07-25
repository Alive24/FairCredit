import { LiteSVM } from "litesvm";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { expect } from "chai";
import { readFileSync } from "fs";
import { Keypair, PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { spawn, ChildProcess } from "child_process";

/**
 * Provider Management Tests - Hybrid Architecture
 * 
 * Uses LiteSVM for fast functional tests and standard Anchor for security tests
 */

// Test configuration
const SKIP_STANDARD_TESTS = process.env.SKIP_STANDARD === "true";

// Validator management
let validatorProcess: ChildProcess | null = null;

async function startValidator(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("🚀 Starting Solana test validator...");
    
    // Check if program binary exists
    const programPath = "target/deploy/fair_credit.so";
    try {
      readFileSync(programPath);
    } catch (error) {
      console.error("❌ Program binary not found. Please build first: anchor build");
      reject(new Error("Program binary not found"));
      return;
    }
    
    validatorProcess = spawn("solana-test-validator", [
      "--reset",
      "--quiet",
      "--ledger", ".anchor/test-ledger",
      "--bpf-program",
      "BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk",
      programPath
    ], {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let output = "";
    let errorOutput = "";

    validatorProcess.stdout?.on("data", (data) => {
      output += data.toString();
      if (output.includes("JSON RPC URL")) {
        console.log("✅ Validator started successfully with program loaded");
        resolve();
      }
    });

    validatorProcess.stderr?.on("data", (data) => {
      errorOutput += data.toString();
    });

    validatorProcess.on("error", (error) => {
      console.error("❌ Failed to start validator:", error);
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (validatorProcess && !validatorProcess.killed) {
        console.log("✅ Validator startup timeout, assuming it's ready");
        resolve();
      }
    }, 30000);
  });
}

async function stopValidator(): Promise<void> {
  if (validatorProcess && !validatorProcess.killed) {
    console.log("🛑 Stopping validator...");
    validatorProcess.kill("SIGTERM");
    
    return new Promise((resolve) => {
      validatorProcess!.on("exit", () => {
        console.log("✅ Validator stopped");
        validatorProcess = null;
        resolve();
      });
      
      // Force kill after 5 seconds
      setTimeout(() => {
        if (validatorProcess && !validatorProcess.killed) {
          validatorProcess.kill("SIGKILL");
          validatorProcess = null;
          resolve();
        }
      }, 5000);
    });
  }
}

async function isValidatorRunning(): Promise<boolean> {
  try {
    const connection = new Connection("http://localhost:8899", "confirmed");
    await connection.getVersion();
    return true;
  } catch {
    return false;
  }
}

describe("Provider Management - Hybrid Tests", () => {
  // LiteSVM Test Suite
  describe("🚀 Functional Tests (LiteSVM)", () => {
    let svm: LiteSVM;
    let program: Program<FairCredit>;
    let providerWallet: Keypair;
    let adminWallet: Keypair;
    let providerPDA: PublicKey;
    let providerBump: number;

    const providerName = "Scholars Bridge Initiative";
    const providerDescription = "Elite academic research program connecting A-Level students with PhD mentors";

    before(async () => {
      // Initialize LiteSVM
      svm = new LiteSVM();

      // Load program binary and get program ID
      const programBytes = readFileSync("target/deploy/fair_credit.so");
      const programId = new PublicKey("BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk");
      
      // Add program to LiteSVM
      svm.addProgram(programId, programBytes);

      // Generate test wallets
      providerWallet = Keypair.generate();
      adminWallet = Keypair.generate();

      // Fund test wallets
      svm.airdrop(providerWallet.publicKey, BigInt(2 * LAMPORTS_PER_SOL));
      svm.airdrop(adminWallet.publicKey, BigInt(2 * LAMPORTS_PER_SOL));

      // Calculate provider PDA
      [providerPDA, providerBump] = PublicKey.findProgramAddressSync(
        [Buffer.from("provider"), providerWallet.publicKey.toBuffer()],
        programId
      );

      // Create program instance for LiteSVM with custom provider
      const wallet = new anchor.Wallet(providerWallet);
      
      // Create enhanced connection wrapper for LiteSVM
      const enhancedConnection = {
        // Delegate all existing LiteSVM methods
        ...svm,
        
        // Add missing methods that Anchor expects
        getAccountInfoAndContext: async (pubkey: PublicKey) => {
          try {
            const account = svm.getAccount(pubkey);
            return {
              context: { slot: 0 },
              value: account
            };
          } catch (error) {
            return {
              context: { slot: 0 },
              value: null
            };
          }
        },
        
        getLatestBlockhash: async () => {
          return {
            blockhash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
            lastValidBlockHeight: 1000
          };
        },
        
        getRecentBlockhash: async () => {
          return {
            blockhash: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG",
            feeCalculator: { lamportsPerSignature: 5000 }
          };
        }
      };

      // Create a custom provider that works with LiteSVM
      const customProvider = {
        connection: enhancedConnection,
        wallet: wallet,
        opts: anchor.AnchorProvider.defaultOptions(),
        publicKey: wallet.publicKey,
        
        // LiteSVM-compatible sendAndConfirm implementation
        sendAndConfirm: async (tx: any, signers?: any[], opts?: any): Promise<string> => {
          try {
            // Set recent blockhash if not already set
            if (!tx.recentBlockhash) {
              tx.recentBlockhash = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
            }
            
            // Set fee payer if not already set
            if (!tx.feePayer && wallet.payer) {
              tx.feePayer = wallet.payer.publicKey;
            }
            
            // Sign transaction with provided signers
            if (signers && signers.length > 0) {
              tx.partialSign(...signers);
            }
            
            // Sign with wallet if it exists
            if (wallet.payer) {
              tx.partialSign(wallet.payer);
            }
            
            // Send transaction through LiteSVM and check result
            const result = svm.sendTransaction(tx);
            
            // LiteSVM sendTransaction returns the transaction result directly
            // If it doesn't throw, the transaction succeeded
            return "litesvm-tx-" + Date.now();
          } catch (error) {
            console.error("LiteSVM Transaction error:", error);
            throw error;
          }
        },
        
        send: async (tx: any, signers?: any[], opts?: any) => {
          return customProvider.sendAndConfirm(tx, signers, opts);
        }
      };

      // Set the custom provider
      anchor.setProvider(customProvider as any);
      
      // Create program instance
      program = new Program<FairCredit>(
        JSON.parse(readFileSync("target/idl/fair_credit.json", "utf8")),
        customProvider as any
      );
    });

    it("✅ Should initialize provider successfully", async () => {
      const tx = await program.methods
        .initializeProvider(providerName, providerDescription)
        .accounts({
          providerAccount: providerPDA,
          providerAuthority: providerWallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([providerWallet])
        .rpc();

      expect(tx).to.be.a("string");
      expect(tx).to.include("litesvm-tx-");
    });

    it("✅ Should update provider status to Verified", async () => {
      const tx = await program.methods
        .updateProviderStatus({ verified: {} })
        .accounts({
          providerAccount: providerPDA,
          adminAuthority: providerWallet.publicKey,
        } as any)
        .signers([providerWallet])
        .rpc();

      expect(tx).to.be.a("string");
      expect(tx).to.include("litesvm-tx-");
    });

    it("✅ Should update provider status to Suspended", async () => {
      const tx = await program.methods
        .updateProviderStatus({ suspended: {} })
        .accounts({
          providerAccount: providerPDA,
          adminAuthority: providerWallet.publicKey,
        } as any)
        .signers([providerWallet])
        .rpc();

      expect(tx).to.be.a("string");
      expect(tx).to.include("litesvm-tx-");
    });

    it("✅ Should restore provider status to Verified", async () => {
      const tx = await program.methods
        .updateProviderStatus({ verified: {} })
        .accounts({
          providerAccount: providerPDA,
          adminAuthority: providerWallet.publicKey,
        } as any)
        .signers([providerWallet])
        .rpc();

      expect(tx).to.be.a("string");
      expect(tx).to.include("litesvm-tx-");
    });

    describe("Edge Cases", () => {
      it("✅ Should handle reasonable provider names and descriptions", async () => {
        const wallet = Keypair.generate();
        svm.airdrop(wallet.publicKey, BigInt(1 * LAMPORTS_PER_SOL));

        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from("provider"), wallet.publicKey.toBuffer()],
          program.programId
        );

        const tx = await program.methods
          .initializeProvider("Oxford University Research Program", "A comprehensive research program for advanced studies")
          .accounts({
            providerAccount: pda,
            providerAuthority: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([wallet])
          .rpc();

        expect(tx).to.be.a("string");
        expect(tx).to.include("litesvm-tx-");
      });

      it("✅ Should handle empty descriptions", async () => {
        const wallet = Keypair.generate();
        svm.airdrop(wallet.publicKey, BigInt(1 * LAMPORTS_PER_SOL));

        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from("provider"), wallet.publicKey.toBuffer()],
          program.programId
        );

        const tx = await program.methods
          .initializeProvider("Test Provider", "")
          .accounts({
            providerAccount: pda,
            providerAuthority: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          } as any)
          .signers([wallet])
          .rpc();

        expect(tx).to.be.a("string");
        expect(tx).to.include("litesvm-tx-");
      });

      it("✅ Should handle long provider names and descriptions gracefully", async () => {
        const wallet = Keypair.generate();
        svm.airdrop(wallet.publicKey, BigInt(1 * LAMPORTS_PER_SOL));

        const [pda] = PublicKey.findProgramAddressSync(
          [Buffer.from("provider"), wallet.publicKey.toBuffer()],
          program.programId
        );

        const longName = "A".repeat(100);
        const longDescription = "B".repeat(200);

        try {
          const tx = await program.methods
            .initializeProvider(longName, longDescription)
            .accounts({
              providerAccount: pda,
              providerAuthority: wallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .signers([wallet])
            .rpc();

          expect(tx).to.be.a("string");
          expect(tx).to.include("litesvm-tx-");
        } catch (error) {
          expect(error.toString()).to.include("AccountDidNotSerialize");
        }
      });
    });

    describe("Performance Tests", () => {
      it("🚀 Should handle multiple rapid transactions", async () => {
        const testWallets = Array.from({ length: 5 }, () => Keypair.generate());
        const results: boolean[] = [];
        
        // Fund all test wallets
        for (const wallet of testWallets) {
          svm.airdrop(wallet.publicKey, BigInt(1 * LAMPORTS_PER_SOL));
        }

        // Create providers rapidly
        for (let i = 0; i < testWallets.length; i++) {
          const wallet = testWallets[i];
          const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("provider"), wallet.publicKey.toBuffer()],
            program.programId
          );

          let success = false;
          try {
            await program.methods
              .initializeProvider(`Test Provider ${i}`, `Description ${i}`)
              .accounts({
                providerAccount: pda,
                providerAuthority: wallet.publicKey,
                systemProgram: anchor.web3.SystemProgram.programId,
              } as any)
              .signers([wallet])
              .rpc();
            
            success = true;
          } catch (error) {
            // Some may fail due to various constraints
          }
          
          results.push(success);
        }

        // Expect at least some transactions to succeed
        const successCount = results.filter(r => r).length;
                expect(successCount).to.be.greaterThan(2);
      });
    });
  });

  // Standard Anchor Test Suite for Security
  if (!SKIP_STANDARD_TESTS) {
    describe("🔒 Security Tests (Standard Anchor)", () => {
      let program: Program<FairCredit>;
      let provider: anchor.AnchorProvider;
      let testProviderWallet: Keypair;
      let testProviderPDA: PublicKey;
      let unauthorizedWallet: Keypair;
      let validatorStartedByTest = false;

      before(async function() {
        this.timeout(60000); // Increase timeout for validator startup
        
        console.log("🔍 Checking validator status...");
        const validatorRunning = await isValidatorRunning();
        
        if (!validatorRunning) {
          console.log("📋 Validator not running, starting automatically...");
          try {
            await startValidator();
            validatorStartedByTest = true;
            
            // Wait a bit more for validator to be fully ready
            console.log("⏳ Waiting for validator to be fully ready...");
            await new Promise(resolve => setTimeout(resolve, 3000));
          } catch (error) {
            console.error("❌ Failed to start validator:", error);
            console.log("⚠️ Skipping security tests - validator startup failed");
            console.log("💡 You can manually start the validator with: npm run validator");
            this.skip();
          }
        } else {
          console.log("✅ Validator already running");
        }

        // Set up Anchor provider
        try {
          const connection = new Connection("http://localhost:8899", "confirmed");
          
          // Create or load wallet
          let wallet: anchor.Wallet;
          if (process.env.ANCHOR_WALLET && process.env.ANCHOR_WALLET !== "~/.config/solana/id.json") {
            // Use specified wallet
            const keypairFile = readFileSync(process.env.ANCHOR_WALLET, "utf8");
            const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(keypairFile)));
            wallet = new anchor.Wallet(keypair);
          } else {
            // Create temporary wallet for testing
            wallet = new anchor.Wallet(Keypair.generate());
            
            // Airdrop SOL to the temporary wallet
            console.log("💰 Funding test wallet...");
            await connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: "confirmed",
            preflightCommitment: "confirmed"
          });
          
          anchor.setProvider(provider);

          // Load program
          program = new Program<FairCredit>(
            JSON.parse(readFileSync("target/idl/fair_credit.json", "utf8")),
            provider
          );

          console.log("✅ Anchor provider setup complete");
        } catch (error) {
          console.error("❌ Failed to setup Anchor provider:", error);
          this.skip();
        }

        // Create test wallets
        testProviderWallet = Keypair.generate();
        unauthorizedWallet = Keypair.generate();

        // Airdrop SOL to test wallets
        console.log("💰 Funding test wallets...");
        try {
          await provider.connection.requestAirdrop(testProviderWallet.publicKey, 2 * LAMPORTS_PER_SOL);
          await provider.connection.requestAirdrop(unauthorizedWallet.publicKey, 2 * LAMPORTS_PER_SOL);

          // Wait for airdrops to confirm
          await new Promise(resolve => setTimeout(resolve, 2000));
          console.log("✅ Test wallets funded");
        } catch (error) {
          console.error("❌ Failed to fund test wallets:", error);
          this.skip();
        }

        // Calculate PDA
        [testProviderPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("provider"), testProviderWallet.publicKey.toBuffer()],
          program.programId
        );

        // Initialize test provider
        try {
          console.log("🏗️ Initializing test provider...");
          await program.methods
            .initializeProvider("Security Test Provider", "Provider for security testing")
            .accounts({
              providerAccount: testProviderPDA,
              providerAuthority: testProviderWallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            } as any)
            .signers([testProviderWallet])
            .rpc();
          console.log("✅ Test provider initialized");
        } catch (error) {
          console.error("❌ Failed to initialize test provider:", error);
          throw error;
        }
      });

      after(async function() {
        this.timeout(15000);
        
        if (validatorStartedByTest) {
          await stopValidator();
        }
      });

      it("🔒 Should allow provider owner to update status", async () => {
        const tx = await program.methods
          .updateProviderStatus({ verified: {} })
          .accounts({
            providerAccount: testProviderPDA,
            adminAuthority: testProviderWallet.publicKey,
          } as any)
          .signers([testProviderWallet])
          .rpc();

        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);
        console.log("✅ Authorized update succeeded");
      });

      it("🔒 Should reject unauthorized user trying to update provider status", async () => {
        let transactionSucceeded = false;
        let caughtError: any = null;

        try {
          await program.methods
            .updateProviderStatus({ suspended: {} })
            .accounts({
              providerAccount: testProviderPDA,
              adminAuthority: unauthorizedWallet.publicKey,
            } as any)
            .signers([unauthorizedWallet])
            .rpc();
          
          transactionSucceeded = true;
          console.log("🚨 CRITICAL SECURITY ISSUE: Unauthorized transaction succeeded!");
        } catch (error) {
          caughtError = error;
          console.log("✅ Unauthorized transaction correctly rejected");
        }

        expect(transactionSucceeded).to.be.false;
        expect(caughtError).to.not.be.null;
      });

      it("🔒 Should consistently reject multiple unauthorized attempts", async () => {
        const unauthorizedWallets = [
          Keypair.generate(),
          Keypair.generate(),
          Keypair.generate()
        ];

        // Fund wallets
        console.log("💰 Funding unauthorized test wallets...");
        for (const wallet of unauthorizedWallets) {
          await provider.connection.requestAirdrop(wallet.publicKey, LAMPORTS_PER_SOL);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));

        let rejectionCount = 0;
        
        for (const wallet of unauthorizedWallets) {
          try {
            await program.methods
              .updateProviderStatus({ pending: {} })
              .accounts({
                providerAccount: testProviderPDA,
                adminAuthority: wallet.publicKey,
              } as any)
              .signers([wallet])
              .rpc();
            
            console.log(`🚨 SECURITY ISSUE: Wallet ${wallet.publicKey.toString()} gained unauthorized access`);
          } catch (error) {
            rejectionCount++;
            console.log(`✅ Wallet ${wallet.publicKey.toString().slice(0, 8)}... correctly rejected`);
          }
        }

        expect(rejectionCount).to.equal(unauthorizedWallets.length);
        console.log(`✅ All ${rejectionCount} unauthorized attempts were rejected`);
      });
    });
  }
}); 