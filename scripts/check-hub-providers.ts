#!/usr/bin/env npx tsx

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { PublicKey } from "@solana/web3.js";

// Override the cluster to devnet
process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function checkHubProviders() {
  console.log("🔍 Checking Hub Providers on Devnet");
  console.log("==================================\n");

  // Set up provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.FairCredit as Program<FairCredit>;
  
  const [hubPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    program.programId
  );

  try {
    // Fetch hub data
    const hub = await program.account.hub.fetch(hubPDA);
    
    console.log("📊 Hub Data:");
    console.log("  Authority:", hub.authority.toBase58());
    console.log("  Accepted Providers:", hub.acceptedProviders.length);
    
    if (hub.acceptedProviders.length > 0) {
      console.log("\n✅ Accepted Providers:");
      hub.acceptedProviders.forEach((provider, index) => {
        console.log(`  ${index + 1}. ${provider.toBase58()}`);
      });
    } else {
      console.log("\n❌ No accepted providers yet");
    }
    
    console.log("\n  Accepted Courses:", hub.acceptedCourses.length);
    console.log("  Accepted Endorsers:", hub.acceptedEndorsers.length);

  } catch (error) {
    console.error("Error:", error);
  }
}

checkHubProviders()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });