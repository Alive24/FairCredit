# Scripts Directory

Essential scripts for FairCredit development and deployment.

## Deployment Scripts

- **`deploy-devnet-simple.ts`**: Simple deployment script for devnet
- **`init-hub-devnet.ts`**: Initialize hub on devnet after program deployment
- **`check-devnet-deployment.ts`**: Verify deployment status and configuration

## Hub Management Scripts

- **`create-provider-for-wallet.ts`**: Create provider account for a given wallet address
- **`add-provider-to-hub.ts`**: Add an existing provider to the hub's accepted list
- **`create-test-provider-funded.ts`**: Create a test provider with funding from hub authority

## Utility Scripts

- **`get-hub-authority.ts`**: Get the current hub authority public key
- **`list-providers.ts`**: List all providers and their status
- **`check-hub-providers.ts`**: Check current hub state and accepted providers
- **`test-hub-decoder.ts`**: Test the hub account decoder functionality

## Usage

All scripts are TypeScript files that can be run with:

```bash
npx ts-node script-name.ts
```

Make sure you have the required environment variables set in `.env`:
- `ANCHOR_PROVIDER_URL` - Solana RPC endpoint
- `ANCHOR_WALLET` - Path to wallet keypair file (if needed)

## Configuration

- **`tsconfig.json`**: TypeScript configuration for scripts