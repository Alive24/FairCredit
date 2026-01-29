/**
 * Deploy the program to the configured cluster.
 */

import { execSync } from "child_process";
import type { DeployConfig } from "../config";

export function deploy(config: DeployConfig): void {
  const cwd = config.anchorRoot;
  execSync(`anchor deploy --provider.cluster ${config.cluster}`, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      ANCHOR_WALLET: config.walletPath,
      ANCHOR_PROVIDER_URL: getRpcUrl(config.cluster),
    },
  });
}

function getRpcUrl(cluster: string): string {
  switch (cluster) {
    case "devnet":
      return "https://api.devnet.solana.com";
    case "mainnet-beta":
      return "https://api.mainnet-beta.solana.com";
    default:
      return "http://localhost:8899";
  }
}
