#!/usr/bin/env npx tsx

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { PublicKey, SystemProgram } from "@solana/web3.js";

// Override the cluster to devnet
process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function initHubDevnet() {
  console.log("🚀 Initializing Hub on Devnet");
  console.log("===========================\n");

  // Set up provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.FairCredit as Program<FairCredit>;
  
  console.log("Program ID:", program.programId.toBase58());
  console.log("Authority:", provider.wallet.publicKey.toBase58());

  const [hubPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    program.programId
  );

  console.log("Hub PDA:", hubPDA.toBase58());

  try {
    // Check if already initialized
    const hubAccount = await provider.connection.getAccountInfo(hubPDA);
    if (hubAccount) {
      console.log("✅ Hub already initialized!");
      return;
    }

    // Initialize hub
    console.log("\n📝 Initializing hub...");
    const tx = await program.methods
      .initializeHub()
      .accounts({
        authority: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Hub initialized!");
    console.log("Transaction:", tx);

    // Verify
    const hub = await program.account.hub.fetch(hubPDA);
    console.log("\n📊 Hub Details:");
    console.log("  Authority:", hub.authority.toBase58());
    console.log("  Accepted Providers:", hub.acceptedProviders.length);
    console.log("  Accepted Courses:", hub.acceptedCourses.length);
    console.log("  Accepted Endorsers:", hub.acceptedEndorsers.length);

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

initHubDevnet()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });