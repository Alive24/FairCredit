/**
 * Development Wallet Utilities for Testing
 * 
 * IMPORTANT: This is for DEVELOPMENT/TESTING ONLY
 * Never use these utilities or keys on mainnet
 */

import { Keypair } from '@solana/web3.js'

/**
 * Generate a Keypair from the development mnemonic
 * This can be used for Playwright testing or other development scenarios
 */
export function getDevWallet(): Keypair | null {
  const mnemonic = process.env.DEV_MNEMONIC
  
  if (!mnemonic) {
    console.warn('DEV_MNEMONIC not found in environment variables')
    return null
  }

  try {
    // For now, we'll generate a deterministic keypair from the mnemonic
    // In a real implementation, you might want to use @solana/web3.js utilities
    // or a library like bip39 to properly derive from mnemonic
    
    // Simple hash-based generation for testing (not cryptographically secure)
    const seed = Buffer.from(mnemonic).slice(0, 32)
    return Keypair.fromSeed(seed)
  } catch (error) {
    console.error('Failed to generate dev wallet:', error)
    return null
  }
}

/**
 * Get the development wallet public key as string
 */
export function getDevWalletPublicKey(): string | null {
  const wallet = getDevWallet()
  return wallet ? wallet.publicKey.toBase58() : null
}

/**
 * Check if we're in development/testing mode
 */
export function isTestMode(): boolean {
  return process.env.PLAYWRIGHT_TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
}