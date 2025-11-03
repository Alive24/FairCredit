# FairCredit Deployment Guide

## Current Deployment Status

The FairCredit smart contract has been successfully deployed to local Solana network with the following minimal setup:

### Deployed Components

1. **Smart Contract**
   - Program ID: `BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk`
   - Network: Localnet (`http://localhost:8899`)

2. **Hub Account** (Curated Registry)
   - Address: `GPftMStJZ5h7uvM5FwZXHwxm7DBv6YdPtDDWRYcnpqKf`
   - Authority: `F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs`
   - Features:
     - Maintains list of accepted providers
     - Maintains list of accepted endorsers
     - Maintains list of accepted courses

3. **Provider Account**
   - Address: `7xRZhV7pcQtE96nU8ookpEfxkw957t3NofGe87nCkr1M`
   - Wallet: `8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn`
   - Name: "Solana Academy"
   - Description: "Premier Solana education provider"
   - Status: Accepted by Hub

4. **Course**
   - Address: `GZ7y1s7mw3xNpyDS9qXqKKgz372YYnU67D2d66JmURvb`
   - ID: `SOLANA101`
   - Name: "Introduction to Solana Development"
   - Provider: Solana Academy
   - Status: Accepted by Hub

## Authority Addresses Explained

### Hub Authority
- **Address**: `F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs`
- **Source**: This is the default Solana CLI wallet (`~/.config/solana/id.json`)
- **Role**: Has full control over the Hub - can add/remove providers, endorsers, and courses
- **Usage**: Used when running deployment scripts and admin operations

### Provider Authority
- **Address**: `8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn`
- **Source**: Generated during deployment (see `deployment.json` for private key)
- **Role**: Controls the "Solana Academy" provider account
- **Permissions**: Can create courses, manage course content, and issue credentials

### Key Relationships
- The Hub Authority is different from Provider Authority for separation of concerns
- Hub Authority manages the curated registry (quality control)
- Provider Authority manages educational content (courses and credentials)
- In production, these would be different entities (e.g., DAO vs Educational Institution)

## Running the System

### 1. Start Local Validator

```bash
solana-test-validator --reset --quiet
```

### 2. Deploy Contract and Initialize Data

```bash
# Deploy the program
anchor deploy

# Run the minimal deployment script
npx ts-node scripts/deploy-minimal.ts
```

### 3. Start the DApp

```bash
cd app
npm run dev
```

The dapp will be available at `http://localhost:3000`

### Key Pages

- Courses: `http://localhost:3000/courses`
- Home: `http://localhost:3000`

## Architecture Overview

### Smart Contract Features

- **Decentralized Operations**: All credential creation, endorsement, and verification happen on-chain
- **Hub Filtering**: Optional curated registry for quality control
- **Provider System**: Educational institutions can register and create courses
- **Course Management**: Providers can create and manage educational programs
- **NFT Credentials**: Each credential will be minted as an NFT (not yet implemented in minimal deployment)

### DApp Integration

- **Wallet Connection**: Supports Phantom and Solflare wallets
- **Course Display**: Shows Hub-accepted courses from accepted providers
- **Provider/Service Architecture**: Clean separation between Solana client and UI components

## PDA Seed Conventions

- Credential-related PDAs now use an 8-byte little-endian encoding of the credential identifier. Use the exported `toLE8(id)` helper from `app/lib/solana/config.ts` to guarantee parity with the on-chain `u64` seeds.
- Client helpers `getCredentialPDA(id)` and `getVerificationRecordPDA(id, verifier)` wrap `PublicKey.findProgramAddressSync` with the canonical seeds used by the Anchor program.
- Verifier accounts and verification records share deterministic helpers (`getVerifierPDA`, `getVerificationRecordPDA`) so tests and scripts derive identical addresses without manually re-specifying seed layouts.
- Avoid passing unsafe JavaScript numbers (>53 bits). The helpers accept `number | bigint | BN` and will throw if a value cannot be represented as an unsigned 64-bit integer.

## Next Steps

1. **Credential Minting**: Implement the credential creation and NFT minting functionality
2. **Endorsement System**: Add mentor/supervisor endorsement capabilities
3. **Student Enrollment**: Allow students to enroll in courses
4. **Activity Logging**: Implement on-chain activity tracking
5. **Verification Pages**: Create public credential verification pages

## Files Created

- `/scripts/deploy-minimal.ts` - Deployment script for minimal setup
- `/scripts/dapp-integration.ts` - Integration helper for dapps
- `/deployment.json` - Deployment addresses and configuration
- `/app/lib/solana/config.ts` - Solana configuration for dapp
- `/app/lib/solana/simple-client.ts` - Simplified Solana client
- `/app/lib/solana/context.tsx` - React context for FairCredit
- `/app/components/courses/course-list.tsx` - Course listing component

## Important Notes

- The Hub account size was reduced from 1000/2000 to 50/100 items for local deployment
- The simple client uses mocked data for now - full Anchor integration can be added later
- Provider private key is stored in deployment.json for testing only - never commit real keys!

## Authority Summary

| Account Type | Authority Address | Description | Source |
|-------------|------------------|-------------|---------|
| Hub | `F7xXsyVCTieJssPccJTt2x8nr5A81YM7cMizS5SL16bs` | Controls the curated registry | Default Solana CLI wallet |
| Provider | `8NY4S4qwomeR791SRvFrj51vEayN3V4TLq37uBzEj5pn` | Controls "Solana Academy" provider | Generated during deployment |

In a production environment:
- **Hub Authority** would typically be a DAO or governance body responsible for quality control
- **Provider Authorities** would be individual educational institutions with their own wallets
- **Students and Endorsers** would have their own wallets for interacting with the system
