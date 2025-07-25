import { Keypair, Connection, PublicKey } from "@solana/web3.js";
// @ts-ignore - bs58 types not available
import bs58 from "bs58";

// Hub authority keypair for automated testing
const HUB_AUTHORITY_SECRET = "5mdcUteXC3qhj8pvNQx765xuXPbU9KutBZabqsmn36YuKzf3wZDECSVAN3XyhuAfhQbGENS3MUUKiZimncdm4t8q";
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