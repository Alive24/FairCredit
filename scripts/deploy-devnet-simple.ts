#!/usr/bin/env ts-node

import { createSolanaRpc } from "@solana/kit";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getHubAddress } from "./utils/pda";
import { fetchMaybeHub } from "../app/lib/solana/generated/accounts";
import { createSignerFromSecretKey } from "./utils/keypair-signer";

async function deployDevnetSimple() {
  console.log("🚀 Initializing FairCredit Hub on Devnet");
  console.log("======================================\n");

  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found at ${walletPath}`);
  }

  const keypairData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const secretKey = Uint8Array.from(keypairData);
  const walletSigner = await createSignerFromSecretKey(secretKey);
  const walletAddress = walletSigner.address;

  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);

  const balanceResponse = await rpc.getBalance(walletAddress).send();
  console.log("Balance:", Number(balanceResponse.value) / 1e9, "SOL");

  const hubPDA = await getHubAddress();

  console.log("\n🔍 Checking Hub Status...");
  console.log("Hub PDA:", hubPDA);

  const hubAccount = await fetchMaybeHub(rpc, hubPDA);
  if (hubAccount.exists && hubAccount.data) {
    console.log("✅ Hub already initialized!");
    console.log("Hub Authority:", hubAccount.data.authority);
  } else {
    console.log("❌ Hub not initialized. You need to run the initialization.");
    console.log("\nTo initialize the hub:");
    console.log("1. Run: npx tsx scripts/init-hub-devnet.ts");
  }

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
