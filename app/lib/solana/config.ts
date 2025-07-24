import { PublicKey } from "@solana/web3.js";

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

export function getCredentialPDA(credentialId: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("credential"), Buffer.from(credentialId.toString())],
    PROGRAM_ID
  );
}

export function getHubPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hub")],
    PROGRAM_ID
  );
}