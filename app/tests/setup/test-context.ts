"use client";

import {
  createSolanaRpc,
  type TransactionSigner,
  type Address,
} from "@solana/kit";
import {
  generateTestSigner,
  requestAirdrop,
  getHubPDA,
  getProviderPDA,
  sendInstructions,
  getRpcUrl,
  LAMPORTS_PER_SOL,
} from "../utils/test-helpers.ts";
import { getInitializeHubInstructionAsync } from "../../lib/solana/generated/instructions/initializeHub";
import { fetchHub } from "../../lib/solana/generated/accounts/hub";

export type TestContext = {
  rpcUrl: string;
  rpc: ReturnType<typeof createSolanaRpc>;
  providerWallet: TransactionSigner;
  studentWallet: TransactionSigner;
  mentorWallet: TransactionSigner;
  hubAuthority: TransactionSigner;
  hubPDA: Address;
  providerPDA: Address;
};

let cachedContextPromise: Promise<TestContext> | null = null;

export async function getTestContext(): Promise<TestContext> {
  if (!cachedContextPromise) {
    cachedContextPromise = createTestContext();
  }
  return cachedContextPromise;
}

async function createTestContext(): Promise<TestContext> {
  const rpcUrl = getRpcUrl();
  const rpc = createSolanaRpc(rpcUrl);

  const providerWallet = await generateTestSigner();
  const studentWallet = await generateTestSigner();
  const mentorWallet = await generateTestSigner();
  const hubAuthority = await generateTestSigner();

  await Promise.all([
    requestAirdrop(rpcUrl, providerWallet.address, 2 * LAMPORTS_PER_SOL),
    requestAirdrop(rpcUrl, studentWallet.address, 1 * LAMPORTS_PER_SOL),
    requestAirdrop(rpcUrl, mentorWallet.address, 1 * LAMPORTS_PER_SOL),
    requestAirdrop(rpcUrl, hubAuthority.address, 2 * LAMPORTS_PER_SOL),
  ]);
  await sleep(1000);

  const [hubPDA] = await getHubPDA();
  const [providerPDA] = await getProviderPDA(hubPDA, providerWallet.address);

  await ensureHubInitialized({
    rpc,
    rpcUrl,
    hubPDA,
    hubAuthority,
  });

  return {
    rpcUrl,
    rpc,
    providerWallet,
    studentWallet,
    mentorWallet,
    hubAuthority,
    hubPDA,
    providerPDA,
  };
}

async function ensureHubInitialized(params: {
  rpc: ReturnType<typeof createSolanaRpc>;
  rpcUrl: string;
  hubPDA: Address;
  hubAuthority: TransactionSigner;
}) {
  const { rpc, rpcUrl, hubPDA, hubAuthority } = params;
  const hubInfo = await rpc
    .getAccountInfo(hubPDA, { encoding: "base64" } as any)
    .send();
  if (!hubInfo.value) {
    const initHubIx = await getInitializeHubInstructionAsync({
      hub: hubPDA,
      authority: hubAuthority,
    });
    await sendInstructions(rpcUrl, [initHubIx], hubAuthority);
    await sleep(1000);
    return;
  }

  const existingHub = await fetchHub(rpc, hubPDA);
  if (existingHub.data.authority !== hubAuthority.address) {
    throw new Error(
      "Hub already initialized with a different authority. Restart your local validator with --reset before running tests."
    );
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
