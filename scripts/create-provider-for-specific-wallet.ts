#!/usr/bin/env npx tsx

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { PublicKey, SystemProgram, Keypair, Transaction } from "@solana/web3.js";

// Override the cluster to devnet
process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function createProviderForWallet() {
  console.log("🏢 Creating Provider Account for Specific Wallet on Devnet");
  console.log("=========================================================\n");

  // Set up provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.FairCredit as Program<FairCredit>;
  
  try {
    // Use the specific wallet address
    const specificWalletPubkey = new PublicKey("F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs");
    console.log("📝 Creating provider for wallet:", specificWalletPubkey.toBase58());

    const [providerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), specificWalletPubkey.toBuffer()],
      program.programId
    );
    console.log("  Provider PDA:", providerPDA.toBase58());

    console.log("\n🔧 Initializing provider account...");
    
    // Since we don't have the private key, we need the hub authority to create this account
    // The provider authority will be set to the specific wallet, but the transaction is paid by hub authority
    
    const signature = await program.methods
      .initializeProvider(
        "FairCredit Test Provider", // name
        "Test provider account for F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs", // description
        "https://faircredit.com", // website
        "test@faircredit.com", // email
        "educational" // provider type
      )
      .accounts({
        providerAuthority: specificWalletPubkey,
      })
      .rpc();
    
    console.log("✅ Provider account created!");
    console.log("  Transaction:", signature);
    console.log("  Provider PDA:", providerPDA.toBase58());
    console.log("  Provider Authority:", specificWalletPubkey.toBase58());

    console.log("\n🎯 Next Steps:");
    console.log("1. The provider account is now created");
    console.log("2. The wallet F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs should now show as a valid provider");
    console.log("3. You can now connect with this wallet in the provider dashboard");

  } catch (error) {
    console.error("Error:", error);
    
    if (error.message?.includes("already in use")) {
      console.log("✅ Provider account already exists for this wallet!");
      console.log("The wallet F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs should be ready to use as a provider.");
    } else {
      throw error;
    }
  }
}

createProviderForWallet()
  .then(() => {
    console.log("\n✅ Provider setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });