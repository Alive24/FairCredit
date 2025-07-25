#!/usr/bin/env ts-node

import { Connection, PublicKey, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk");

async function deployDevnetSimple() {
  console.log("🚀 Initializing FairCredit Hub on Devnet");
  console.log("======================================\n");

  // Load the wallet
  const walletPath = path.join(os.homedir(), '.config/solana/id.json');
  const keypairData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  
  console.log("Wallet:", wallet.publicKey.toBase58());

  // Connect to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");

  // Check if hub is already initialized
  const [hubPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    PROGRAM_ID
  );
  
  console.log("\n🔍 Checking Hub Status...");
  console.log("Hub PDA:", hubPDA.toBase58());
  
  const hubAccount = await connection.getAccountInfo(hubPDA);
  if (hubAccount) {
    console.log("✅ Hub already initialized!");
    
    // Try to decode authority from hub data
    if (hubAccount.data.length >= 40) {
      const authority = new PublicKey(hubAccount.data.slice(8, 40));
      console.log("Hub Authority:", authority.toBase58());
    }
  } else {
    console.log("❌ Hub not initialized. You need to run the initialization through Anchor.");
    console.log("\nTo initialize the hub:");
    console.log("1. Run: anchor run init-hub --provider.cluster devnet");
    console.log("2. Or create an initialization script using the Anchor framework");
  }

  // Save the configuration
  const devnetConfig = {
    network: "devnet",
    programId: PROGRAM_ID.toBase58(),
    hub: {
      pda: hubPDA.toBase58(),
      authority: wallet.publicKey.toBase58(),
    },
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../devnet-config.json"),
    JSON.stringify(devnetConfig, null, 2)
  );

  console.log("\n📄 Configuration saved to devnet-config.json");
  console.log("\n🔑 To use in the app:");
  console.log("1. Run: cat ~/.config/solana/id.json | base64");
  console.log("2. Click 'Import Dev Key' in the app");
  console.log("3. Paste the base64 string");
  console.log("4. Connect with 'Dev Wallet (Real Transactions)'");
}

deployDevnetSimple()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });