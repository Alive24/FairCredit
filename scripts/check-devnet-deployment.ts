#!/usr/bin/env ts-node

import { createSolanaRpc } from "@solana/kit";
import { address } from "@solana/kit";
import { getHubAddress } from "./utils/pda";
import { fetchMaybeHub } from "../app/lib/solana/generated/accounts";

const PROGRAM_ID = "BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk";

async function checkDevnetDeployment() {
  console.log("🔍 Checking FairCredit Deployment on Devnet");
  console.log("==========================================\n");

  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);

  console.log("1️⃣ Checking Program...");
  const programId = address(PROGRAM_ID);
  const programInfo = await rpc.getAccountInfo(programId).send();

  if (programInfo.value) {
    console.log(`✅ Program deployed at: ${PROGRAM_ID}`);
    console.log(`   Owner: ${programInfo.value.owner}`);
    console.log(`   Executable: ${programInfo.value.executable}`);
  } else {
    console.log(`❌ Program NOT found on devnet!`);
    console.log(`   You need to deploy the program first.`);
    return;
  }

  console.log("\n2️⃣ Checking Hub Account...");
  const hubPDA = await getHubAddress();

  console.log(`   Hub PDA: ${hubPDA}`);
  const hubInfo = await fetchMaybeHub(rpc, hubPDA);

  if (hubInfo.exists && hubInfo.data) {
    console.log(`✅ Hub account exists!`);
    console.log(`   Authority: ${hubInfo.data.authority}`);
    console.log(
      `   Accepted Providers: ${hubInfo.data.acceptedProviders.length}`,
    );
    console.log(`   Accepted Courses: ${hubInfo.data.acceptedCourses.length}`);
    console.log(
      `   Accepted Endorsers: ${hubInfo.data.acceptedEndorsers.length}`,
    );
  } else {
    console.log(`❌ Hub account NOT initialized!`);
    console.log(`   You need to initialize the hub first.`);
  }

  console.log("\n📝 Next Steps:");
  if (!programInfo.value) {
    console.log("1. Deploy the program to devnet:");
    console.log("   anchor deploy --provider.cluster devnet");
  } else if (!hubInfo.exists || !hubInfo.data) {
    console.log("1. Initialize the hub on devnet:");
    console.log("   npx tsx scripts/init-hub-devnet.ts");
  } else {
    console.log(
      "1. Import the hub authority keypair using the 'Import Dev Key' button",
    );
    console.log("2. Connect with 'Dev Wallet (Real Transactions)'");
    console.log("3. Start managing the hub!");
  }
}

checkDevnetDeployment()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
