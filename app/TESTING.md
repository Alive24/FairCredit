# FairCredit Testing Guide

This document explains how to set up and run tests for the FairCredit application, including wallet integration testing.

## Development Environment Setup

### 1. Environment Variables

Copy the `.env.example` file to `.env` and configure the development settings:

```bash
cp .env.example .env
```

The development environment includes:
- **DEV_MNEMONIC**: Development wallet seed phrase (12 words)
- **PLAYWRIGHT_TEST_MODE**: Enable testing mode
- **SOLANA_NETWORK**: Network configuration (devnet for testing)
- **SOLANA_RPC_URL**: Solana RPC endpoint

### 2. Development Wallet

The development wallet is configured with a test mnemonic for consistent testing:
```
uniform utility suffer dirt object turtle digital false tail lion elegant sword
```

**⚠️ IMPORTANT**: This wallet is for DEVELOPMENT/TESTING ONLY. Never use on mainnet!

## Playwright Testing

### Installation

Install Playwright and its dependencies:

```bash
npm install -D @playwright/test
npx playwright install
```

### Running Tests

Start the development server:
```bash
npm run dev
```

Run Playwright tests:
```bash
npx playwright test
```

Run tests with UI mode:
```bash
npx playwright test --ui
```

Run specific test file:
```bash
npx playwright test tests/wallet-connection.spec.ts
```

### Test Structure

Tests are organized in the `tests/` directory:
- `wallet-connection.spec.ts`: Wallet connection and role selection tests
- Additional test files can be added as needed

## Wallet Extension Testing

For full wallet integration testing, you'll need to:

1. **Install Phantom Extension**: Add Phantom to your test browser
2. **Import Development Wallet**: Use the mnemonic from `.env`
3. **Configure Network**: Set Phantom to devnet mode

### Setting up Phantom for Testing

1. Install Phantom browser extension
2. Create new wallet using the development mnemonic:
   ```
   uniform utility suffer dirt object turtle digital false tail lion elegant sword
   ```
3. Switch network to Devnet in Phantom settings
4. Run tests that require wallet connection

## Test Utilities

### Development Wallet Utilities

The `test-utils/dev-wallet.ts` file provides utilities for working with the development wallet:

```typescript
import { getDevWallet, getDevWalletPublicKey, isTestMode } from '../test-utils/dev-wallet'

// Get development wallet keypair
const wallet = getDevWallet()

// Get public key as string
const publicKey = getDevWalletPublicKey()

// Check if in test mode
const testMode = isTestMode()
```

## Security Notes

- The `.env` file is gitignored and should never be committed
- Development keys are only for testing on devnet
- Never use development keys on mainnet
- Always use separate keys for production environments

## Common Test Scenarios

### 1. Basic Navigation Tests
- Homepage loading
- Navigation links functionality
- Hub dashboard access

### 2. Wallet Connection Tests
- Connect wallet button functionality
- Wallet selection modal display
- Role selection persistence

### 3. Dashboard Tests
- Provider dashboard functionality
- Hub administration features
- Student/Supervisor dashboards

### 4. Integration Tests
- End-to-end user workflows
- Cross-component functionality
- Data persistence testing

## Troubleshooting

### Common Issues

1. **Wallet not connecting**: Ensure Phantom is installed and configured for devnet
2. **Tests timing out**: Check if dev server is running on localhost:3000
3. **Environment variables not loading**: Verify `.env` file exists and is properly formatted

### Debug Mode

Run tests with debug information:
```bash
npx playwright test --debug
```

Generate test report:
```bash
npx playwright show-report
```

## Contributing

When adding new tests:
1. Follow the existing test structure
2. Use descriptive test names
3. Add appropriate assertions
4. Test both success and error cases
5. Update this documentation as needed