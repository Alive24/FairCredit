#!/usr/bin/env npx tsx

import { createSolanaRpc } from "@solana/kit";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getInitializeHubInstructionAsync } from "../app/lib/solana/generated/instructions";
import { createSignerFromSecretKey } from "./utils/keypair-signer";
import { sendInstructions } from "./utils/transaction-helper";
import { getHubAddress } from "./utils/pda";
import { fetchMaybeHub } from "../app/lib/solana/generated/accounts";

process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function initHubDevnet() {
  console.log("🚀 Initializing Hub on Devnet");
  console.log("===========================\n");

  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found at ${walletPath}`);
  }

  const keypairData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const secretKey = Uint8Array.from(keypairData);
  const authoritySigner = await createSignerFromSecretKey(secretKey);

  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);

  console.log("Program ID:", "BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk");
  console.log("Authority:", authoritySigner.address);

  const hubPDA = await getHubAddress();
  console.log("Hub PDA:", hubPDA);

  try {
    const hubAccount = await fetchMaybeHub(rpc, hubPDA);
    if (hubAccount.exists && hubAccount.data) {
      console.log("✅ Hub already initialized!");
      return;
    }

    console.log("\n📝 Initializing hub...");
    const instruction = await getInitializeHubInstructionAsync(
      {
        hub: hubPDA,
        authority: authoritySigner,
        systemProgram: undefined,
      },
      {},
    );

    const signature = await sendInstructions(
      rpcUrl,
      [instruction],
      authoritySigner,
    );

    console.log("✅ Hub initialized!");
    console.log("Transaction:", signature);

    const hub = await fetchMaybeHub(rpc, hubPDA);
    if (hub.exists && hub.data) {
      console.log("\n📊 Hub Details:");
      console.log("  Authority:", hub.data.authority);
      console.log("  Accepted Providers:", hub.data.acceptedProviders.length);
      console.log("  Accepted Courses:", hub.data.acceptedCourses.length);
      console.log("  Accepted Endorsers:", hub.data.acceptedEndorsers.length);
    }
  } catch (error: any) {
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
