#!/usr/bin/env npx tsx

import { createSolanaRpc } from "@solana/kit";
import { address } from "@solana/kit";
import { getHubPDA } from "./utils/pda";
import { fetchMaybeHub } from "../app/lib/solana/generated/accounts";

process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function checkHubProviders() {
  console.log("🔍 Checking Hub Providers on Devnet");
  console.log("==================================\n");

  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);

  const [hubPDA] = await getHubPDA();

  try {
    const hub = await fetchMaybeHub(rpc, hubPDA);

    if (!hub.exists || !hub.data) {
      console.log("❌ Hub not found!");
      return;
    }

    console.log("📊 Hub Data:");
    console.log("  Authority:", hub.data.authority);

    console.log("  Accepted Providers:", hub.data.acceptedProviders.length);

    if (hub.data.acceptedProviders.length > 0) {
      console.log("\n✅ Accepted Providers:");
      hub.data.acceptedProviders.forEach((provider: string, index: number) => {
        console.log(`  ${index + 1}. ${provider}`);
      });
    } else {
      console.log("\n❌ No accepted providers yet");
    }

    console.log("\n  Accepted Courses:", hub.data.acceptedCourses.length);
    console.log("  Accepted Endorsers:", hub.data.acceptedEndorsers.length);
  } catch (error: any) {
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
