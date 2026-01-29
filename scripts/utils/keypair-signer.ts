import {
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
} from "@solana/signers";
import type { TransactionSigner } from "@solana/kit";

export async function createSignerFromSecretKey(
  secretKey: Uint8Array,
): Promise<TransactionSigner> {
  if (secretKey.length === 64) {
    return createKeyPairSignerFromBytes(secretKey);
  } else if (secretKey.length === 32) {
    return createKeyPairSignerFromPrivateKeyBytes(secretKey);
  } else {
    throw new Error(
      `Invalid secret key length: ${secretKey.length}. Expected 32 or 64 bytes.`,
    );
  }
}
