#!/usr/bin/env ts-node

import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = "BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk";

async function checkDevnetDeployment() {
  console.log("🔍 Checking FairCredit Deployment on Devnet");
  console.log("==========================================\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Check if program exists
  console.log("1️⃣ Checking Program...");
  const programId = new PublicKey(PROGRAM_ID);
  const programInfo = await connection.getAccountInfo(programId);
  
  if (programInfo) {
    console.log(`✅ Program deployed at: ${PROGRAM_ID}`);
    console.log(`   Owner: ${programInfo.owner.toBase58()}`);
    console.log(`   Executable: ${programInfo.executable}`);
  } else {
    console.log(`❌ Program NOT found on devnet!`);
    console.log(`   You need to deploy the program first.`);
    return;
  }

  // Check Hub PDA
  console.log("\n2️⃣ Checking Hub Account...");
  const [hubPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    programId
  );
  
  console.log(`   Hub PDA: ${hubPDA.toBase58()}`);
  const hubInfo = await connection.getAccountInfo(hubPDA);
  
  if (hubInfo) {
    console.log(`✅ Hub account exists!`);
    console.log(`   Size: ${hubInfo.data.length} bytes`);
    console.log(`   Owner: ${hubInfo.owner.toBase58()}`);
    
    // Try to decode the first 32 bytes as the authority
    if (hubInfo.data.length >= 40) {
      const authority = new PublicKey(hubInfo.data.slice(8, 40));
      console.log(`   Authority: ${authority.toBase58()}`);
    }
  } else {
    console.log(`❌ Hub account NOT initialized!`);
    console.log(`   You need to initialize the hub first.`);
  }

  // Check deployment.json
  console.log("\n3️⃣ Checking Local Deployment Info...");
  const deploymentPath = path.join(__dirname, "../deployment.json");
  
  if (fs.existsSync(deploymentPath)) {
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
    console.log("📋 Local deployment.json:");
    console.log(`   Network: ${deployment.network}`);
    console.log(`   Hub Authority: ${deployment.hub.authority}`);
    console.log(`   Provider: ${deployment.provider.wallet}`);
    
    if (deployment.network === "localnet") {
      console.log("\n⚠️  WARNING: deployment.json is for localnet, not devnet!");
      console.log("   You need to deploy to devnet and update deployment.json");
    }
  }

  // Instructions
  console.log("\n📝 Next Steps:");
  if (!programInfo) {
    console.log("1. Deploy the program to devnet:");
    console.log("   anchor deploy --provider.cluster devnet");
  } else if (!hubInfo) {
    console.log("1. Initialize the hub on devnet:");
    console.log("   anchor run deploy:minimal --provider.cluster devnet");
  } else {
    console.log("1. Import the hub authority keypair using the 'Import Dev Key' button");
    console.log("2. Connect with 'Dev Wallet (Real Transactions)'");
    console.log("3. Start managing the hub!");
  }
}

checkDevnetDeployment()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("Error:", error);
    process.exit(1);
  });