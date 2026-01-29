#!/usr/bin/env npx tsx

import { createSolanaRpc } from "@solana/kit";
import { getInitializeProviderInstructionAsync } from "../app/lib/solana/generated/instructions";
import { createSignerFromSecretKey } from "./utils/keypair-signer";
import { sendInstructions } from "./utils/transaction-helper";
import { getProviderAddress, createPlaceholderSigner } from "./utils/pda";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

process.env.ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
process.env.ANCHOR_WALLET = process.env.HOME + "/.config/solana/id.json";

async function createProviderForWallet() {
  console.log("🏢 Creating Provider Account for Specific Wallet on Devnet");
  console.log("=========================================================\n");

  const walletPath = path.join(os.homedir(), ".config/solana/id.json");
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet not found at ${walletPath}`);
  }

  const keypairData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const secretKey = Uint8Array.from(keypairData);
  const hubAuthoritySigner = await createSignerFromSecretKey(secretKey);

  const rpcUrl = "https://api.devnet.solana.com";
  const specificWalletAddr = "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs";
  console.log("📝 Creating provider for wallet:", specificWalletAddr);

  const providerPDA = await getProviderAddress(
    createPlaceholderSigner(specificWalletAddr),
  );
  console.log("  Provider PDA:", providerPDA);

  console.log("\n🔧 Initializing provider account...");

  try {
    const instruction = await getInitializeProviderInstructionAsync(
      {
        providerAccount: providerPDA,
        providerAuthority: hubAuthoritySigner,
        systemProgram: undefined,
        name: "FairCredit Test Provider",
        description:
          "Test provider account for F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs",
        website: "https://faircredit.com",
        email: "test@faircredit.com",
        providerType: "educational",
      },
      {},
    );

    const signature = await sendInstructions(
      rpcUrl,
      [instruction],
      hubAuthoritySigner,
    );

    console.log("✅ Provider account created!");
    console.log("  Transaction:", signature);
    console.log("  Provider PDA:", providerPDA);
    console.log("  Provider Authority:", specificWalletAddr);

    console.log("\n🎯 Next Steps:");
    console.log("1. The provider account is now created");
    console.log(
      "2. The wallet F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs should now show as a valid provider",
    );
    console.log(
      "3. You can now connect with this wallet in the provider dashboard",
    );
  } catch (error: any) {
    console.error("Error:", error);

    if (error.message?.includes("already in use")) {
      console.log("✅ Provider account already exists for this wallet!");
      console.log(
        "The wallet F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs should be ready to use as a provider.",
      );
    } else {
      throw error;
    }
  }
}

createProviderForWallet()
  .then(() => {
    console.log("\n✅ Provider setup complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Failed:", error);
    process.exit(1);
  });
