# FairCredit Testing Guide

## Overview

This guide explains how to test the FairCredit application with real wallets on Solana devnet.

## Wallet Setup

### Manual Testing with Phantom

1. **Hub Authority Wallet**
   - Public Key: `F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs`
   - Private Key (Base58): `5mdcUteXC3qhj8pvNQx765xuXPbU9KutBZabqsmn36YuKzf3wZDECSVAN3XyhuAfhQbGENS3MUUKiZimncdm4t8q`

2. **Import to Phantom**:
   - Open Phantom wallet
   - Settings → Manage Accounts → Add/Connect Wallet
   - Select "Import Private Key"
   - Paste the Base58 private key
   - Name it "FairCredit Hub Authority"

3. **Switch to Devnet**:
   - Settings → Developer Settings → Enable Testnet Mode
   - Network → Select "Devnet"

### Automated Testing with Playwright

The test suite uses the hub authority keypair directly for automated testing. No Phantom extension is required.

## Running Tests

### Hub Management Tests
```bash
cd app
npm test -- hub-management.test.ts
```

### Create Test Provider
```bash
npx tsx ../scripts/create-test-provider.ts
```

This creates a provider account that can be added to the hub.

## Test Configuration

- Network: Solana Devnet
- RPC URL: https://api.devnet.solana.com
- Program ID: `BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk`
- Hub PDA: `GPftMStJZ5h7uvM5FwZXHwxm7DBv6YdPtDDWRYcnpqKf`

## Hub Management Flow

1. **Provider Registration** (Two-step process):
   - Provider calls `initialize_provider` to create their account
   - Hub authority calls `add_accepted_provider` to accept them

2. **Course Creation**:
   - Provider creates course
   - Hub authority accepts course

3. **Endorser Management**:
   - Hub authority adds/removes accepted endorsers

## Development Wallet

The app includes a "Dev Wallet (Real Transactions)" option for development:
- Allows importing keypairs via UI
- Persists keypair in localStorage
- Can sign and send real transactions

## Security Notes

- Never use these test keys on mainnet
- The provided keypair is for development only
- Always use separate wallets for production