import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FairCredit } from "../target/types/fair_credit";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

// Set up the provider
const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

// Get the program
const program = anchor.workspace.FairCredit as Program<FairCredit>;

// Generate keypairs for our minimal setup
const providerWallet = Keypair.generate();
const hubAuthority = provider.wallet.publicKey;

// Course details
const courseId = "SOLANA101";
const courseName = "Introduction to Solana Development";
const courseDescription = "Learn the fundamentals of Solana blockchain development";

async function main() {
  console.log("🚀 FairCredit Minimal Deployment Script");
  console.log("======================================");
  
  // Step 1: Fund the provider wallet
  console.log("\n1️⃣ Funding provider wallet...");
  const airdropSignature = await provider.connection.requestAirdrop(
    providerWallet.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await provider.connection.confirmTransaction(airdropSignature);
  console.log(`✅ Provider wallet funded: ${providerWallet.publicKey.toBase58()}`);

  // Step 2: Initialize Hub
  console.log("\n2️⃣ Initializing Hub...");
  const [hubPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    program.programId
  );

  try {
    await program.methods
      .initializeHub()
      .accounts({
        authority: hubAuthority,
      })
      .rpc();
    console.log(`✅ Hub initialized with authority: ${hubAuthority.toBase58()}`);
  } catch (error) {
    console.log("⚠️  Hub already initialized");
  }

  // Step 3: Initialize Provider
  console.log("\n3️⃣ Initializing Provider...");
  const [providerPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("provider"), providerWallet.publicKey.toBuffer()],
    program.programId
  );

  await program.methods
    .initializeProvider(
      "Solana Academy",
      "Premier Solana education provider",
      "https://solana-academy.com",
      "contact@solana-academy.com",
      "education"
    )
    .accounts({
      providerAuthority: providerWallet.publicKey,
    })
    .signers([providerWallet])
    .rpc();
  console.log(`✅ Provider initialized: ${providerWallet.publicKey.toBase58()}`);

  // Step 4: Add Provider to Hub
  console.log("\n4️⃣ Adding Provider to Hub's accepted list...");
  await program.methods
    .addAcceptedProvider()
    .accounts({
      authority: hubAuthority,
      providerWallet: providerWallet.publicKey,
    })
    .rpc();
  console.log(`✅ Provider added to Hub's accepted list`);

  // Step 5: Create Course
  console.log("\n5️⃣ Creating Course...");
  const [coursePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("course"), Buffer.from(courseId)],
    program.programId
  );

  await program.methods
    .createCourse(
      courseId,
      courseName,
      courseDescription,
      100, // workload required
      null  // no degree ID
    )
    .accounts({
      providerAuthority: providerWallet.publicKey,
    })
    .signers([providerWallet])
    .rpc();
  console.log(`✅ Course created: ${courseId}`);

  // Step 6: Add Course to Hub
  console.log("\n6️⃣ Adding Course to Hub's accepted list...");
  await program.methods
    .addAcceptedCourse(courseId)
    .accounts({
      authority: hubAuthority,
    })
    .rpc();
  console.log(`✅ Course added to Hub's accepted list`);

  // Step 7: Save deployment info
  console.log("\n7️⃣ Saving deployment information...");
  const deploymentInfo = {
    network: "localnet",
    programId: program.programId.toBase58(),
    hub: {
      address: hubPDA.toBase58(),
      authority: hubAuthority.toBase58(),
    },
    provider: {
      address: providerPDA.toBase58(),
      wallet: providerWallet.publicKey.toBase58(),
      privateKey: Buffer.from(providerWallet.secretKey).toString('base64'),
    },
    course: {
      address: coursePDA.toBase58(),
      id: courseId,
      name: courseName,
    },
    timestamp: new Date().toISOString(),
  };

  const deploymentPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`✅ Deployment info saved to: ${deploymentPath}`);

  // Step 8: Verify deployment
  console.log("\n8️⃣ Verifying deployment...");
  const hubAccount = await program.account.hub.fetch(hubPDA);
  const courseAccount = await program.account.course.fetch(coursePDA);
  
  console.log("\n✨ Deployment Summary:");
  console.log("====================");
  console.log(`Program ID: ${program.programId.toBase58()}`);
  console.log(`Hub Address: ${hubPDA.toBase58()}`);
  console.log(`  - Authority: ${hubAccount.authority.toBase58()}`);
  console.log(`  - Accepted Providers: ${hubAccount.acceptedProviders.length}`);
  console.log(`  - Accepted Courses: ${hubAccount.acceptedCourses.length}`);
  console.log(`Provider Address: ${providerPDA.toBase58()}`);
  console.log(`Course Address: ${coursePDA.toBase58()}`);
  console.log(`  - ID: ${courseAccount.id}`);
  console.log(`  - Name: ${courseAccount.name}`);
  console.log(`  - Provider: ${courseAccount.provider.toBase58()}`);
  
  console.log("\n🎉 Minimal deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });