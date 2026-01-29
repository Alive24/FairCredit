/**
 * Placeholder TransactionSigner for read operations
 * This signer is only used to get resolved account addresses from Codama instructions.
 * It should never be used to actually sign transactions.
 */

import { address, type Address, type TransactionSigner } from "@solana/kit";
import type { TransactionMessageBytes, SignaturesMap } from "@solana/kit";

/**
 * Create a placeholder signer with a given address
 * This is only used for read operations to get PDA addresses from Codama instructions
 */
export function createPlaceholderSigner(
  addressString: string,
): TransactionSigner {
  const addr = address(addressString);
  return {
    address: addr,
    signAndSendTransactions: async () => {
      throw new Error(
        "Placeholder signer cannot be used to sign transactions. This is only for read operations.",
      );
    },
  };
}

/**
 * Default placeholder signer with a dummy address
 * Used when we only need to resolve PDAs and don't have a real signer
 */
export const DEFAULT_PLACEHOLDER_SIGNER = createPlaceholderSigner(
  "11111111111111111111111111111111",
);
