/**
 * Test helpers for migrating from Anchor to @solana/kit and Codama
 */
import { createSolanaRpc } from "@solana/kit";
import {
  getProgramDerivedAddress,
  address,
  lamports,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { getBytesEncoder, getAddressEncoder } from "@solana/kit";
import { generateKeyPairSigner } from "@solana/signers";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "../../lib/solana/generated/programs";
import { sendInstructions as sendInstructionsHelper } from "../../../scripts/utils/transaction-helper";

const LAMPORTS_PER_SOL = 1_000_000_000;

/**
 * Convert a number to little-endian 8-byte array
 */
export function toLE8(
  value: number | bigint | { toString: () => string }
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
 * Convert a signed i64 to little-endian 8-byte array
 */
export function toLEI64(value: number | bigint): Uint8Array {
  const num = typeof value === "number" ? BigInt(value) : value;
  if (num < -(2n ** 63n) || num > 2n ** 63n - 1n) {
    throw new RangeError(`Value ${num} is out of range for i64`);
  }
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigInt64(0, num, true); // little-endian
  return new Uint8Array(buffer);
}

/**
 * Convert an unsigned u16 value to little-endian bytes
 */
export function toLEU16(value: number | bigint): Uint8Array {
  const num = typeof value === "number" ? BigInt(value) : value;
  if (num < 0n || num > 0xffffn) {
    throw new RangeError(`Value ${num} is out of range for u16`);
  }
  const buffer = new ArrayBuffer(2);
  const view = new DataView(buffer);
  view.setUint16(0, Number(num), true);
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
  hub: Address | string,
  providerAuthority: Address | string
): Promise<[Address, number]> {
  const hubAddr = typeof hub === "string" ? address(hub) : hub;
  const authorityAddr =
    typeof providerAuthority === "string"
      ? address(providerAuthority)
      : providerAuthority;
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([112, 114, 111, 118, 105, 100, 101, 114])
      ),
      getAddressEncoder().encode(hubAddr),
      getAddressEncoder().encode(authorityAddr),
    ],
  });
  return [pda[0], pda[1]];
}

/**
 * Get Course PDA (seeds: "course", hub, provider PDA, creation_timestamp)
 */
export async function getCoursePDA(
  hub: Address | string,
  provider: Address | string,
  creationTimestamp: number | bigint
): Promise<[Address, number]> {
  const hubAddr = typeof hub === "string" ? address(hub) : hub;
  const providerAddr =
    typeof provider === "string" ? address(provider) : provider;
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([99, 111, 117, 114, 115, 101])),
      getAddressEncoder().encode(hubAddr),
      getAddressEncoder().encode(providerAddr),
      toLEI64(creationTimestamp),
    ],
  });
  return [pda[0], pda[1]];
}

/**
 * Get Credential PDA (seeds: "credential", course, student)
 */
export async function getCredentialPDA(
  course: Address | string,
  student: Address | string
): Promise<[Address, number]> {
  const courseAddr = typeof course === "string" ? address(course) : course;
  const studentAddr = typeof student === "string" ? address(student) : student;
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([99, 114, 101, 100, 101, 110, 116, 105, 97, 108])
      ),
      getAddressEncoder().encode(courseAddr),
      getAddressEncoder().encode(studentAddr),
    ],
  });
  return [pda[0], pda[1]];
}

/**
 * Get CourseList PDA (seeds: "course-list", hub, index)
 */
export async function getCourseListPDA(
  hub: Address | string,
  index: number | bigint
): Promise<[Address, number]> {
  const hubAddr = typeof hub === "string" ? address(hub) : hub;
  const pda = await getProgramDerivedAddress({
    programAddress: FAIR_CREDIT_PROGRAM_ADDRESS,
    seeds: [
      getBytesEncoder().encode(
        new Uint8Array([99, 111, 117, 114, 115, 101, 45, 108, 105, 115, 116])
      ),
      getAddressEncoder().encode(hubAddr),
      toLEU16(index),
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
  signer: TransactionSigner
): Promise<string> {
  return sendInstructionsHelper(rpcUrl, instructions, signer);
}

/**
 * Request airdrop
 */
export async function requestAirdrop(
  rpcUrl: string,
  addr: Address | string,
  amount: number
): Promise<string> {
  const rpc = createSolanaRpc(rpcUrl);
  const addressValue = typeof addr === "string" ? address(addr) : addr;
  const signature = await rpc
    .requestAirdrop(addressValue, lamports(BigInt(amount)))
    .send();
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
