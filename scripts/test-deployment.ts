import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { PublicKey } from "@solana/web3.js";

// Set up the provider
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// Get the program
const program = anchor.workspace.FairCredit as Program<FairCredit>;

async function main() {
  console.log("🔍 Testing FairCredit Deployment");
  console.log("================================");
  
  console.log("Program ID:", program.programId.toBase58());
  console.log("Provider wallet:", provider.wallet.publicKey.toBase58());
  
  // Check if Hub exists
  const [hubPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    program.programId
  );
  
  console.log("\nHub PDA:", hubPDA.toBase58());
  
  try {
    const hubAccount = await program.account.hub.fetch(hubPDA);
    console.log("✅ Hub exists!");
    console.log("  Authority:", hubAccount.authority.toBase58());
    console.log("  Accepted Providers:", hubAccount.acceptedProviders.length);
    console.log("  Accepted Endorsers:", hubAccount.acceptedEndorsers.length);
    console.log("  Accepted Courses:", hubAccount.acceptedCourses.length);
  } catch (error) {
    console.log("❌ Hub not found, needs initialization");
    
    // Try to initialize
    console.log("\nAttempting to initialize Hub...");
    try {
      await program.methods
        .initializeHub()
        .accounts({
          authority: provider.wallet.publicKey,
        })
        .rpc();
      console.log("✅ Hub initialized successfully!");
    } catch (initError) {
      console.error("❌ Failed to initialize Hub:", initError);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });