"use client";

/**
 * PDA derivation helpers for FairCredit program.
 * These mirror the on-chain seed patterns so the frontend can compute PDAs
 * without making extra RPC calls.
 */

import {
  getAddressEncoder,
  getBytesEncoder,
  getProgramDerivedAddress,
  type Address,
} from "@solana/kit";
import { FAIR_CREDIT_PROGRAM_ADDRESS } from "@/lib/solana/generated/programs";
export { FAIR_CREDIT_PROGRAM_ADDRESS };

// Seed bytes (UTF-8 encoded) -----------------------------------------------
const HUB_SEED = new Uint8Array([104, 117, 98]); // "hub"
const PROVIDER_SEED = new Uint8Array([112, 114, 111, 118, 105, 100, 101, 114]); // "provider"
const CREDENTIAL_SEED = new Uint8Array([
  99, 114, 101, 100, 101, 110, 116, 105, 97, 108,
]); // "credential"

/**
 * Derive the Hub PDA. There is only one Hub per program.
 */
export async function getHubPDA(
  programAddress: Address = FAIR_CREDIT_PROGRAM_ADDRESS,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress,
    seeds: [getBytesEncoder().encode(HUB_SEED)],
  });
  return pda;
}

/**
 * Derive the Provider PDA for a given provider wallet.
 * Seeds: ["provider", hub_key, wallet_key]
 */
export async function getProviderPDA(
  providerWallet: Address,
  hubPDA?: Address,
  programAddress: Address = FAIR_CREDIT_PROGRAM_ADDRESS,
): Promise<Address> {
  const hub = hubPDA ?? (await getHubPDA(programAddress));
  const [pda] = await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(PROVIDER_SEED),
      getAddressEncoder().encode(hub),
      getAddressEncoder().encode(providerWallet),
    ],
  });
  return pda;
}

/**
 * Derive the Credential PDA for a given course + student.
 * Seeds: ["credential", course_key, student_wallet_key]
 */
export async function getCredentialPDA(
  courseAddress: Address,
  studentWallet: Address,
  programAddress: Address = FAIR_CREDIT_PROGRAM_ADDRESS,
): Promise<Address> {
  const [pda] = await getProgramDerivedAddress({
    programAddress,
    seeds: [
      getBytesEncoder().encode(CREDENTIAL_SEED),
      getAddressEncoder().encode(courseAddress),
      getAddressEncoder().encode(studentWallet),
    ],
  });
  return pda;
}
