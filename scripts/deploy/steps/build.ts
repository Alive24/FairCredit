/**
 * Build the Anchor program.
 */

import { execSync } from "child_process";
import * as path from "path";
import type { DeployConfig } from "../config";

export function build(config: DeployConfig): void {
  const cwd = config.anchorRoot;
  execSync("anchor build", {
    cwd,
    stdio: "inherit",
    env: { ...process.env, ANCHOR_PROVIDER_URL: getRpcUrl(config.cluster) },
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
