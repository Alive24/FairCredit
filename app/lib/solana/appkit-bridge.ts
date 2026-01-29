/**
 * Minimal bridge: @solana/kit Instruction -> web3.js Transaction
 * Only used when passing a transaction to AppKit's walletProvider.sendTransaction().
 * AppKit expects Transaction | VersionedTransaction from @solana/web3.js; no kit-native alternative.
 */

import { AccountRole } from "@solana/kit";
import type { Instruction } from "@solana/kit";
import {
  Transaction,
  TransactionInstruction,
  PublicKey,
} from "@solana/web3.js";

function toPublicKey(address: string | Uint8Array): PublicKey {
  return new PublicKey(address);
}

/**
 * Convert a @solana/kit Instruction to web3.js TransactionInstruction.
 * Kit instruction shape: { programAddress, accounts: { address, role }[], data }.
 */
export function kitInstructionToWeb3Instruction(
  ix: Instruction,
): TransactionInstruction {
  const keys = (ix.accounts ?? []).map((acc) => {
    const role = acc.role;
    const isSigner =
      role === AccountRole.READONLY_SIGNER ||
      role === AccountRole.WRITABLE_SIGNER;
    const isWritable =
      role === AccountRole.WRITABLE || role === AccountRole.WRITABLE_SIGNER;
    return {
      pubkey: toPublicKey(acc.address),
      isSigner,
      isWritable,
    };
  });
  const data = ix.data ? Buffer.from(ix.data) : Buffer.alloc(0);
  return new TransactionInstruction({
    programId: toPublicKey(ix.programAddress),
    keys,
    data,
  });
}

/**
 * Build a web3.js Transaction from @solana/kit instructions for AppKit sendTransaction.
 */
export function buildTransactionForAppKit(
  instructions: Instruction[],
  feePayerAddress: string,
  blockhash: string,
): Transaction {
  const tx = new Transaction();
  for (const ix of instructions) {
    tx.add(kitInstructionToWeb3Instruction(ix));
  }
  tx.feePayer = toPublicKey(feePayerAddress);
  tx.recentBlockhash = blockhash;
  return tx;
}
