import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// Load deployment configuration
export const DEPLOYMENT_CONFIG = {
  programId: "BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk",
  network: "localnet",
  hub: {
    address: "GPftMStJZ5h7uvM5FwZXHwxm7DBv6YdPtDDWRYcnpqKf",
    authority: "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs"
  },
  provider: {
    address: "7xRZhV7pcQtE96nU8ookpEfxkw957t3NofGe87nCkr1M",
    wallet: "8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn"
  },
  course: {
    address: "GZ7y1s7mw3xNpyDS9qXqKKgz372YYnU67D2d66JmURvb",
    id: "SOLANA101",
    name: "Introduction to Solana Development"
  }
};

export const PROGRAM_ID = new PublicKey(DEPLOYMENT_CONFIG.programId);
export const HUB_PDA = new PublicKey(DEPLOYMENT_CONFIG.hub.address);

// Derive PDAs
export function getProviderPDA(providerWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("provider"), providerWallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getCoursePDA(courseId: string): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("course"), Buffer.from(courseId)],
    PROGRAM_ID
  );
}

export function getHubPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    PROGRAM_ID
  );
}

const MAX_U64 = (1n << 64n) - 1n;

export type U64Seed = number | bigint | BN;

function normaliseU64(id: U64Seed): bigint {
  if (typeof id === "bigint") {
    if (id < 0n || id > MAX_U64) {
      throw new RangeError(`Value ${id} is outside the range of a u64`);
    }
    return id;
  }

  if (typeof id === "number") {
    if (!Number.isSafeInteger(id)) {
      throw new RangeError(`Number ${id} cannot be represented exactly as a u64`);
    }
    return normaliseU64(BigInt(id));
  }

  if (BN.isBN(id)) {
    return normaliseU64(BigInt(id.toString()));
  }

  throw new TypeError("Unsupported credential identifier type");
}

export function toLE8(id: U64Seed): Buffer {
  const value = normaliseU64(id);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

export function getCredentialPDA(credentialId: U64Seed): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), toLE8(credentialId)],
    PROGRAM_ID
  );
}

export function getVerifierPDA(verifierWallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("verifier"), verifierWallet.toBuffer()],
    PROGRAM_ID
  );
}

export function getVerificationRecordPDA(
  credentialId: U64Seed,
  verifierWallet: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("verification"),
      toLE8(credentialId),
      verifierWallet.toBuffer()
    ],
    PROGRAM_ID
  );
}
