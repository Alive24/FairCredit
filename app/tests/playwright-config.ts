import { Keypair, Connection, PublicKey } from "@solana/web3.js";
// @ts-ignore - bs58 types not available
import bs58 from "bs58";

// Hub authority keypair for automated testing (local env only; never commit real values)
const HUB_AUTHORITY_SECRET =
  process.env.HUB_AUTHORITY_SECRET ??
  process.env.TEST_AUTHORITY_SECRET_KEY ??
  "";
const HUB_AUTHORITY_PUBKEY = "F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs";

export const testConfig = {
  // Network configuration
  network: "devnet",
  rpcUrl: "https://api.devnet.solana.com",
  
  // Hub authority wallet for testing
  hubAuthority: {
    publicKey: HUB_AUTHORITY_PUBKEY,
    secretKey: HUB_AUTHORITY_SECRET,
    getKeypair: () => {
      if (!HUB_AUTHORITY_SECRET) {
        throw new Error(
          "Missing HUB_AUTHORITY_SECRET (or TEST_AUTHORITY_SECRET_KEY) in test environment",
        );
      }
      const secretKey = bs58.decode(HUB_AUTHORITY_SECRET);
      return Keypair.fromSecretKey(secretKey);
    }
  },
  
  // Program configuration
  programId: "BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk",
  hubPDA: "GPftMStJZ5h7uvM5FwZXHwxm7DBv6YdPtDDWRYcnpqKf",
  
  // Test timeouts
  timeouts: {
    transaction: 30000, // 30 seconds for transaction confirmation
    pageLoad: 10000,    // 10 seconds for page load
  }
};

// Helper function to get connection
export function getConnection() {
  return new Connection(testConfig.rpcUrl, "confirmed");
}

// Helper function to get hub authority keypair
export function getHubAuthorityKeypair() {
  return testConfig.hubAuthority.getKeypair();
}
