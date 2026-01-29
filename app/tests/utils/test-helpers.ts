/**
 * Test helpers for migrating from Anchor to @solana/kit and Codama
 */
import { createSolanaRpc } from "@solana/kit";
import {
  getProgramDerivedAddress,
  address,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import {
  getBytesEncoder,
  getAddressEncoder,
  getUtf8Encoder,
} from "@solana/kit";
import { generateKeyPairSigner } from "@solana/signers";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "../../lib/solana/generated/programs";
import { sendInstructions as sendInstructionsHelper } from "../../../scripts/utils/transaction-helper";

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Convert a number to little-endian 8-byte array
 */
export function toLE8(
  value: number | bigint | { toString: () => string },
): Uint8Array {
  let num: bigint;
  if (typeof value === "number") {
    if (value < 0 || value > Number.MAX_SAFE_INTEGER) {
      throw new RangeError(`Value ${value} is out of range for safe integer`);
    }
    num = BigInt(value);
  } else if (typeof value === "bigint") {
    num = value;
  } else {
    num = BigInt(value.toString());
  }

  if (num < 0n || num > 0xffffffffffffffffn) {
    throw new RangeError(`Value ${num} is out of range for u64`);
  }

  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, num, true); // little-endian
  return new Uint8Array(buffer);
}

/**
 * Get Hub PDA
 */
export async function getHubPDA(): Promise<[Address, number]> {
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [getBytesEncoder().encode(new Uint8Array([104, 117, 98]))],
  });
  return [pda[0], pda[1]];
}

/**
 * Get Provider PDA
 */
export async function getProviderPDA(
  providerWallet: Address | string,
): Promise<[Address, number]> {
  const walletAddr =
    typeof providerWallet === "string"
      ? address(providerWallet)
      : providerWallet;
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([112, 114, 111, 118, 105, 100, 101, 114]),
      ),
      getAddressEncoder().encode(walletAddr),
    ],
  });
  return [pda[0], pda[1]];
}

/**
 * Get Course PDA
 */
export async function getCoursePDA(
  courseId: string,
): Promise<[Address, number]> {
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([99, 111, 117, 114, 115, 101])),
      getUtf8Encoder().encode(courseId),
    ],
  });
  return [pda[0], pda[1]];
}

/**
 * Get Credential PDA
 */
export async function getCredentialPDA(
  credentialId: number | bigint | { toString: () => string },
): Promise<[Address, number]> {
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([99, 114, 101, 100, 101, 110, 116, 105, 97, 108]),
      ),
      toLE8(credentialId),
    ],
  });
  return [pda[0], pda[1]];
}

/**
 * Send instructions as a transaction
 */
export async function sendInstructions(
  rpcUrl: string,
  instructions: Instruction[],
  signer: TransactionSigner,
): Promise<string> {
  return sendInstructionsHelper(rpcUrl, instructions, signer);
}

/**
 * Request airdrop
 */
export async function requestAirdrop(
  rpcUrl: string,
  addr: Address | string,
  amount: number,
): Promise<string> {
  const rpc = createSolanaRpc(rpcUrl);
  const addressValue = typeof addr === "string" ? address(addr) : addr;
  const lamports = BigInt(amount);

  const signature = await rpc.requestAirdrop(addressValue, lamports).send();
  return signature;
}

/**
 * Generate a test signer
 */
export async function generateTestSigner(): Promise<TransactionSigner> {
  return await generateKeyPairSigner();
}

/**
 * Get RPC URL from environment or default
 */
export function getRpcUrl(): string {
  return process.env.ANCHOR_PROVIDER_URL || "http://localhost:8899";
}

export { LAMPORTS_PER_SOL };
