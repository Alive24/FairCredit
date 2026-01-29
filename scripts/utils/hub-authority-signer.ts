/**
 * Load Hub authority signer from .env or keypair file.
 * - HUB_AUTHORITY_SECRET: bs58-encoded secret key (do not commit!)
 * - HUB_AUTHORITY_KEYPAIR_PATH: path to keypair JSON (default: ~/.config/solana/id.json)
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { createSignerFromSecretKey } from "./keypair-signer";
import type { TransactionSigner } from "@solana/kit";

const REPO_ROOT = path.join(__dirname, "../..");

function loadEnv(): void {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && value !== undefined && !process.env[key]) {
      const unquoted = value.replace(/^["']|["']$/g, "");
      process.env[key] = unquoted;
    }
  }
}

/** Get Hub authority signer from HUB_AUTHORITY_SECRET (bs58) or HUB_AUTHORITY_KEYPAIR_PATH. */
export async function getHubAuthoritySigner(): Promise<TransactionSigner> {
  loadEnv();

  const secretBs58 = process.env.HUB_AUTHORITY_SECRET;
  if (secretBs58) {
    const bs58 = require("bs58");
    const secretKey = bs58.decode(secretBs58);
    return createSignerFromSecretKey(secretKey);
  }

  const keypairPath =
    process.env.HUB_AUTHORITY_KEYPAIR_PATH ||
    path.join(os.homedir(), ".config/solana/id.json");
  if (fs.existsSync(keypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    const secretKey = Uint8Array.from(keypairData);
    return createSignerFromSecretKey(secretKey);
  }

  throw new Error(
    "Hub authority not configured. Set HUB_AUTHORITY_SECRET (bs58) or HUB_AUTHORITY_KEYPAIR_PATH in .env, or create ~/.config/solana/id.json",
  );
}
