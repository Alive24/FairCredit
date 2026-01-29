/**
 * Resolve PDA addresses via Codama-generated instructions only (no hardcoded seeds).
 * Same pattern as app: use instruction Async builders with placeholder/real signer to get addresses.
 */

import type { Address, TransactionSigner } from "@solana/kit";
import { getUpdateHubConfigInstructionAsync } from "../../app/lib/solana/generated/instructions/updateHubConfig";
import { getInitializeProviderInstructionAsync } from "../../app/lib/solana/generated/instructions/initializeProvider";
import { getCreateCourseInstructionAsync } from "../../app/lib/solana/generated/instructions/createCourse";
import { DEFAULT_PLACEHOLDER_SIGNER } from "../../app/lib/solana/placeholder-signer";

/** Re-export for scripts that need to resolve PDA from address string (e.g. getProviderAddress(createPlaceholderSigner(addr))). */
export { createPlaceholderSigner } from "../../app/lib/solana/placeholder-signer";

/** Resolve Hub PDA using Codama UpdateHubConfig instruction (hub: undefined → auto-derived). */
export async function getHubAddress(): Promise<Address> {
  const instruction = await getUpdateHubConfigInstructionAsync({
    hub: undefined,
    authority: DEFAULT_PLACEHOLDER_SIGNER,
    config: {
      requireProviderApproval: false,
      requireEndorserApproval: false,
      minReputationScore: 0,
      allowSelfEndorsement: false,
    },
  });
  return instruction.accounts[0].address;
}

/** Resolve Provider PDA using Codama InitializeProvider instruction; authority signer can be real or placeholder. */
export async function getProviderAddress(
  authoritySigner: TransactionSigner,
): Promise<Address> {
  const instruction = await getInitializeProviderInstructionAsync({
    providerAccount: undefined,
    providerAuthority: authoritySigner,
    name: "",
    description: "",
    website: "",
    email: "",
    providerType: "",
  });
  return instruction.accounts[0].address;
}

/** Resolve Course PDA using Codama CreateCourse instruction; providerAuthority signer can be real or placeholder. */
export async function getCourseAddress(
  courseId: string,
  providerAuthoritySigner: TransactionSigner,
): Promise<Address> {
  const instruction = await getCreateCourseInstructionAsync({
    course: undefined,
    provider: undefined,
    providerAuthority: providerAuthoritySigner,
    courseId,
    name: "",
    description: "",
    workloadRequired: 0,
    degreeId: null,
  });
  return instruction.accounts[0].address;
}
