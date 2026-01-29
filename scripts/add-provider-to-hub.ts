#!/usr/bin/env npx tsx

import { createSolanaRpc } from "@solana/kit";
import { address } from "@solana/kit";
import { getAddAcceptedProviderInstructionAsync } from "../app/lib/solana/generated/instructions";
import { createSignerFromSecretKey } from "./utils/keypair-signer";
import { sendInstructions } from "./utils/transaction-helper";
import { getHubPDA, getProviderPDA } from "./utils/pda";

const HUB_AUTHORITY_SECRET =
  "5mdcUteXC3qhj8pvNQx765xuXPbU9KutBZabqsmn36YuKzf3wZDECSVAN3XyhuAfhQbGENS3MUUKiZimncdm4t8q";

async function addProviderToHub(providerWallet: string) {
  const bs58 = require("bs58");
  const secretKey = bs58.decode(HUB_AUTHORITY_SECRET);
  const hubAuthoritySigner = await createSignerFromSecretKey(secretKey);

  console.log("Hub authority:", hubAuthoritySigner.address);

  const rpcUrl = "https://api.devnet.solana.com";
  const providerWalletAddr = address(providerWallet);
  const [hubPDA] = await getHubPDA();
  const [providerPDA] = await getProviderPDA(providerWallet);

  console.log("Adding provider to hub:");
  console.log("- Provider wallet:", providerWallet);
  console.log("- Provider PDA:", providerPDA);
  console.log("- Hub PDA:", hubPDA);

  try {
    const instruction = await getAddAcceptedProviderInstructionAsync({
      hub: hubPDA,
      authority: hubAuthoritySigner,
      provider: providerPDA,
      providerWallet: providerWalletAddr,
    });

    const signature = await sendInstructions(
      rpcUrl,
      [instruction],
      hubAuthoritySigner,
    );

    console.log("Transaction sent:", signature);
    console.log("Provider added to hub successfully!");

    const rpc = createSolanaRpc(rpcUrl);
    const accountInfo = await rpc.getAccountInfo(hubPDA).send();
    if (accountInfo.value) {
      console.log("\nHub account data length:", accountInfo.value.data.length);
    }
  } catch (error: any) {
    console.error("Error adding provider to hub:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

const yourWallet = "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs";
addProviderToHub(yourWallet).catch(console.error);
