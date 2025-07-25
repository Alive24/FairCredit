import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import idl from "../target/idl/fair_credit.json";
import { PROGRAM_ID, getProviderPDA } from "../app/lib/solana/config";

async function createProviderForWallet(walletAddress: string) {
  // Hub authority keypair - from the base58 private key you provided
  const bs58 = require("bs58");
  const secretKey = bs58.decode("5mdcUteXC3qhj8pvNQx765xuXPbU9KutBZabqsmn36YuKzf3wZDECSVAN3XyhuAfhQbGENS3MUUKiZimncdm4t8q");
  const hubAuthorityKeypair = Keypair.fromSecretKey(secretKey);

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Create anchor provider
  const wallet = new anchor.Wallet(hubAuthorityKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);

  // Create program interface
  const program = new Program(idl as FairCredit, provider);

  const providerWallet = new PublicKey(walletAddress);
  const [providerPDA] = getProviderPDA(providerWallet);

  console.log("Creating provider for wallet:", walletAddress);
  console.log("Provider PDA:", providerPDA.toBase58());

  try {
    // Check if provider already exists
    const providerAccount = await connection.getAccountInfo(providerPDA);
    if (providerAccount) {
      console.log("Provider already exists!");
      return;
    }

    // Create the provider
    const tx = await program.methods
      .initializeProvider(
        "FairCredit Hub Authority",
        "The main hub authority for FairCredit platform",
        "https://faircredit.io",
        "admin@faircredit.io",
        "educational"
      )
      .accounts({
        provider: providerPDA,
        wallet: providerWallet,
        authority: hubAuthorityKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([hubAuthorityKeypair])
      .rpc();

    console.log("Provider created successfully!");
    console.log("Transaction signature:", tx);

    // Verify the provider was created
    const providerAccountInfo = await connection.getAccountInfo(providerPDA);
    if (providerAccountInfo) {
      console.log("\nProvider created successfully!");
      console.log("Provider PDA has", providerAccountInfo.data.length, "bytes of data");
    }

  } catch (error) {
    console.error("Error creating provider:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

// Run for your wallet
const yourWallet = "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs";
createProviderForWallet(yourWallet).catch(console.error);