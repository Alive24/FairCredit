#!/usr/bin/env npx tsx

import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk");

async function listProviders() {
  console.log("🔍 Looking for Existing Providers on Devnet");
  console.log("==========================================\n");

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
  // Get all accounts owned by the program
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      {
        dataSize: 290 // Approximate size of a provider account
      }
    ]
  });

  console.log(`Found ${accounts.length} potential provider accounts\n`);

  for (const account of accounts) {
    console.log("Account:", account.pubkey.toBase58());
    console.log("Size:", account.account.data.length, "bytes");
    
    // Try to decode the provider name (should be after the discriminator and other fields)
    try {
      const data = account.account.data;
      // Skip discriminator (8 bytes) and wallet pubkey (32 bytes)
      const nameStart = 40;
      const nameLength = data.readUInt32LE(nameStart);
      if (nameLength > 0 && nameLength < 100) {
        const name = data.slice(nameStart + 4, nameStart + 4 + nameLength).toString('utf8');
        console.log("Provider Name:", name);
        
        // Get the wallet address (bytes 8-40)
        const walletBytes = data.slice(8, 40);
        const wallet = new PublicKey(walletBytes);
        console.log("Provider Wallet:", wallet.toBase58());
      }
    } catch (e) {
      console.log("Could not decode as provider account");
    }
    console.log("---");
  }

  // Also check for any test providers we might have created
  const testWallets = [
    "8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn", // From deployment.json
  ];

  console.log("\nChecking known test wallets:");
  for (const wallet of testWallets) {
    const walletPubkey = new PublicKey(wallet);
    const [providerPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("provider"), walletPubkey.toBuffer()],
      PROGRAM_ID
    );
    
    const account = await connection.getAccountInfo(providerPDA);
    console.log(`\nWallet: ${wallet}`);
    console.log(`Provider PDA: ${providerPDA.toBase58()}`);
    console.log(`Exists: ${account !== null}`);
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