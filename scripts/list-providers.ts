#!/usr/bin/env npx tsx

import { createSolanaRpc } from "@solana/kit";
import { getProviderAddress, createPlaceholderSigner } from "./utils/pda";
import { fetchMaybeProvider } from "../app/lib/solana/generated/accounts";

async function listProviders() {
  console.log("🔍 Looking for Existing Providers on Devnet");
  console.log("==========================================\n");

  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);

  const testWallets = ["8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn"];

  console.log("Checking known test wallets:");
  for (const wallet of testWallets) {
    const providerPDA = await getProviderAddress(
      createPlaceholderSigner(wallet),
    );

    const account = await fetchMaybeProvider(rpc, providerPDA);
    console.log(`\nWallet: ${wallet}`);
    console.log(`Provider PDA: ${providerPDA}`);
    console.log(`Exists: ${account.exists}`);

    if (account.exists && account.data) {
      console.log(`Provider Name: ${account.data.name}`);
      console.log(`Provider Email: ${account.data.email}`);
    }
  }
}

listProviders()
  .then(() => {
    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
