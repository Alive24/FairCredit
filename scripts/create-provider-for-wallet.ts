#!/usr/bin/env npx tsx

import { createSolanaRpc } from "@solana/kit";
import { address } from "@solana/kit";
import { getInitializeProviderInstructionAsync } from "../app/lib/solana/generated/instructions";
import { sendInstructions } from "./utils/transaction-helper";
import { getProviderAddress, createPlaceholderSigner } from "./utils/pda";
import { getHubAuthoritySigner } from "./utils/hub-authority-signer";
import { fetchMaybeProvider } from "../app/lib/solana/generated/accounts";

async function createProviderForWallet(walletAddress: string) {
  const hubAuthoritySigner = await getHubAuthoritySigner();

  const rpcUrl = "https://api.devnet.solana.com";
  const rpc = createSolanaRpc(rpcUrl);
  const providerWalletAddr = address(walletAddress);
  const providerPDA = await getProviderAddress(
    createPlaceholderSigner(walletAddress),
  );

  console.log("Creating provider for wallet:", walletAddress);
  console.log("Provider PDA:", providerPDA);

  try {
    const providerAccount = await fetchMaybeProvider(rpc, providerPDA);
    if (providerAccount.exists && providerAccount.data) {
      console.log("Provider already exists!");
      return;
    }

    const instruction = await getInitializeProviderInstructionAsync(
      {
        providerAccount: providerPDA,
        providerAuthority: hubAuthoritySigner,
        systemProgram: undefined,
        name: "FairCredit Hub Authority",
        description: "The main hub authority for FairCredit platform",
        website: "https://faircredit.io",
        email: "admin@faircredit.io",
        providerType: "educational",
      },
      {},
    );

    const signature = await sendInstructions(
      rpcUrl,
      [instruction],
      hubAuthoritySigner,
    );

    console.log("Provider created successfully!");
    console.log("Transaction signature:", signature);

    const accountInfo = await rpc.getAccountInfo(providerPDA).send();
    if (accountInfo.value) {
      console.log("\nProvider created successfully!");
      console.log(
        "Provider PDA has",
        accountInfo.value.data.length,
        "bytes of data",
      );
    }
  } catch (error: any) {
    console.error("Error creating provider:", error);
    if (error.logs) {
      console.error("Program logs:", error.logs);
    }
  }
}

const yourWallet = "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs";
createProviderForWallet(yourWallet).catch(console.error);
