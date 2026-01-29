#!/usr/bin/env npx tsx

import { createSolanaRpc } from "@solana/kit";
import { address } from "@solana/kit";
import { generateKeyPairSigner } from "@solana/signers";
import { getInitializeProviderInstructionAsync } from "../app/lib/solana/generated/instructions";
import { createSignerFromSecretKey } from "./utils/keypair-signer";
import { sendInstructions } from "./utils/transaction-helper";
import { getProviderPDA } from "./utils/pda";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { getTransferSolInstruction } from "@solana-program/system";
import { lamports } from "@solana/kit";

process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function createTestProvider() {
  console.log("🏢 Creating Test Provider on Devnet");
  console.log("==================================\n");

  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found at ${walletPath}`);
  }

  const keypairData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const secretKey = Uint8Array.from(keypairData);
  const hubAuthoritySigner = await createSignerFromSecretKey(secretKey);

  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);

  try {
    const providerWalletSigner = await generateKeyPairSigner();
    console.log("📝 Creating new provider:");
    console.log("  Wallet:", providerWalletSigner.address);

    const [providerPDA] = await getProviderPDA(providerWalletSigner.address);
    console.log("  PDA:", providerPDA);

    console.log(
      "\n🔧 Initializing provider (hub authority pays for transaction)...",
    );

    const initInstruction = await getInitializeProviderInstructionAsync(
      {
        providerAccount: address(providerPDA),
        providerAuthority: providerWalletSigner,
        systemProgram: undefined,
        name: "Test Provider " + Date.now(),
        description: "A test provider for hub management testing",
        website: "https://test-provider.com",
        email: "test@provider.com",
        providerType: "educational",
      },
      {},
    );

    const transferInstruction = getTransferSolInstruction({
      source: hubAuthoritySigner,
      destination: providerWalletSigner.address,
      amount: lamports(BigInt(0.01 * 1e9)),
    });

    const signature = await sendInstructions(
      rpcUrl,
      [transferInstruction, initInstruction],
      hubAuthoritySigner,
    );

    console.log("✅ Provider initialized!");
    console.log("  Transaction:", signature);

    const bs58 = require("bs58");
    const providerInfo = {
      wallet: providerWalletSigner.address,
      pda: providerPDA,
      created: new Date().toISOString(),
    };

    const outputPath = path.join(
      __dirname,
      `../test-provider-${Date.now()}.json`,
    );
    fs.writeFileSync(outputPath, JSON.stringify(providerInfo, null, 2));

    console.log("\n📄 Provider info saved to:", outputPath);
    console.log("\n🎯 Next Steps:");
    console.log("1. Use the hub management UI to add this provider");
    console.log("2. Provider wallet address:", providerWalletSigner.address);
  } catch (error: any) {
    console.error("Error:", error);
    throw error;
  }
}

createTestProvider()
  .then(() => {
    console.log("\n✅ Test provider created successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
