#!/usr/bin/env npx tsx

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { PublicKey, SystemProgram, Keypair, Transaction } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore - bs58 types not available
import bs58 from "bs58";

// Override the cluster to devnet
process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function createTestProvider() {
  console.log("🏢 Creating Test Provider on Devnet");
  console.log("==================================\n");

  // Set up provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.FairCredit as Program<FairCredit>;
  
  try {
    // Create a new provider wallet
    const providerWallet = Keypair.generate();
    console.log("📝 Creating new provider:");
    console.log("  Wallet:", providerWallet.publicKey.toBase58());
    console.log("  Secret (Base58):", bs58.encode(providerWallet.secretKey));

    const [providerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), providerWallet.publicKey.toBuffer()],
      program.programId
    );
    console.log("  PDA:", providerPDA.toBase58());

    console.log("\n🔧 Initializing provider (hub authority pays for transaction)...");
    
    // Create the instruction
    const initIx = await program.methods
      .initializeProvider(
        "Test Provider " + Date.now(),
        "A test provider for hub management testing",
        "https://test-provider.com",
        "test@provider.com",
        "educational"
      )
      .accounts({
        providerAuthority: providerWallet.publicKey,
      })
      .instruction();

    // Create transaction and have hub authority pay
    const tx = new Transaction();
    
    // Add transfer to give provider some SOL for future transactions (optional)
    tx.add(
      SystemProgram.transfer({
        fromPubkey: provider.wallet.publicKey,
        toPubkey: providerWallet.publicKey,
        lamports: 0.01 * 1e9, // 0.01 SOL
      })
    );
    
    // Add the initialize instruction
    tx.add(initIx);

    // Send transaction with both signers
    const signature = await provider.sendAndConfirm(tx, [providerWallet]);
    
    console.log("✅ Provider initialized!");
    console.log("  Transaction:", signature);

    // Save provider info
    const providerInfo = {
      wallet: providerWallet.publicKey.toBase58(),
      pda: providerPDA.toBase58(),
      secret: bs58.encode(providerWallet.secretKey),
      secretBase64: Buffer.from(providerWallet.secretKey).toString('base64'),
      created: new Date().toISOString()
    };

    const outputPath = path.join(__dirname, `../test-provider-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(providerInfo, null, 2));
    
    console.log("\n📄 Provider info saved to:", outputPath);
    console.log("\n🎯 Next Steps:");
    console.log("1. Use the hub management UI to add this provider");
    console.log("2. Provider wallet address:", providerWallet.publicKey.toBase58());
    console.log("3. Or run: npx tsx scripts/test-add-provider-simple.ts", providerWallet.publicKey.toBase58());

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

createTestProvider()
  .then(() => {
    console.log("\n✅ Test provider created successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });