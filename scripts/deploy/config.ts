/**
 * Deploy tool configuration.
 * Override via env or pass at runtime for different environments.
 */

import * as path from "path";

const REPO_ROOT = path.resolve(__dirname, "../..");

export type Cluster = "localnet" | "devnet" | "mainnet-beta";

export interface DeployConfig {
  /** Anchor workspace root (where Anchor.toml lives) */
  anchorRoot: string;
  /** Repo root (where codama.json and package.json live) */
  repoRoot: string;
  /** Cluster to deploy to */
  cluster: Cluster;
  /** Path to deployer keypair (default: ~/.config/solana/id.json) */
  walletPath: string;
  /** IDL path after anchor build (relative to anchorRoot) */
  idlPathInAnchor: string;
  /** IDL path for Codama (relative to repoRoot) */
  idlPathForCodama: string;
}

export function getDefaultConfig(cluster: Cluster = "devnet"): DeployConfig {
  return {
    anchorRoot: path.join(REPO_ROOT, "anchor"),
    repoRoot: REPO_ROOT,
    cluster,
    walletPath:
      process.env.ANCHOR_WALLET ||
      path.join(process.env.HOME || "~", ".config/solana/id.json"),
    idlPathInAnchor: "target/idl/fair_credit.json",
    idlPathForCodama: "target/idl/fair_credit.json",
  };
}
