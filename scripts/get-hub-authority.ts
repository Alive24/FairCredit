#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

console.log("🔍 Finding Hub Authority Keypair");
console.log("================================\n");

// Check default Solana CLI location
const defaultPath = path.join(os.homedir(), '.config/solana/id.json');

if (fs.existsSync(defaultPath)) {
  console.log("✅ Found Solana CLI wallet at:", defaultPath);
  
  const keypair = JSON.parse(fs.readFileSync(defaultPath, 'utf-8'));
  const base64 = Buffer.from(keypair).toString('base64');
  
  console.log("\n📋 Your keypair (Base64 encoded):");
  console.log(base64);
  
  console.log("\n🔐 To use this keypair:");
  console.log("1. Click 'Import Dev Key' in the app header");
  console.log("2. Paste the base64 string above");
  console.log("3. Click 'Import Keypair'");
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("- This keypair must be the hub authority (the wallet that deployed the program)");
  console.log("- Make sure you have SOL on devnet: solana airdrop 2 --url devnet");
  console.log("- Never share private keys in production!");
} else {
  console.log("❌ No Solana wallet found at default location");
  console.log("\n📝 To create a new wallet:");
  console.log("   solana-keygen new --no-bip39-passphrase");
  console.log("\n📝 Or specify a custom path:");
  console.log("   Update this script to check your wallet location");
}