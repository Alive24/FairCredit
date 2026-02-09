# FairCredit Deployment Guide

This guide covers deploying the FairCredit smart contract to Solana networks (localnet, devnet, or mainnet-beta) and running the development environment.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ with pnpm
- **Solana CLI** 1.18+
- **Anchor** 0.31+
- **Rust** 1.75+

### Initial Setup

```bash
# Install dependencies
pnpm install

# Set up Solana CLI (if not already configured)
solana config set --url localhost  # or devnet/mainnet-beta
solana-keygen new                  # Create wallet if needed
```

---

## 📦 Deployment Process

### Interactive Deployment Tool

FairCredit includes an interactive deployment tool at `scripts/deploy/index.ts` that streamlines the entire deployment pipeline.

**Usage:**

```bash
pnpm run deploy
```

**Workflow:**

1. **Select Target Cluster**:

   - `localnet` - Local test validator (http://localhost:8899)
   - `devnet` - Solana devnet (public testnet)
   - `mainnet-beta` - Solana mainnet (production)

2. **Choose Action**:
   - **Build only**: Compile the Anchor program (`anchor build`)
   - **Build + Deploy**: Compile and deploy to the selected cluster
   - **Build + Deploy + Copy IDL**: Full deployment + IDL export to `target/idl/`
   - **Build + Deploy + Copy IDL + Codegen**: Complete pipeline (recommended)
   - **Copy IDL + Codegen only**: Regenerate TypeScript client from existing IDL

### Full Pipeline (Recommended)

For a complete deployment with client generation:

```bash
pnpm run deploy
# Select cluster: localnet/devnet/mainnet-beta
# Select action: Build + Deploy + Copy IDL + Run Codama (full pipeline)
```

This will:

1. Build the Anchor program in `anchor/`
2. Deploy to the selected cluster
3. Copy IDL from `anchor/target/idl/fair_credit.json` to `target/idl/fair_credit.json`
4. Run Codama to generate TypeScript client at `app/lib/solana/generated/`

---

## 🔧 Deployment Components

### Configuration

**File**: `scripts/deploy/config.ts`

- **anchorRoot**: `anchor/` directory containing Anchor.toml
- **repoRoot**: Project root directory
- **cluster**: Target network (localnet/devnet/mainnet-beta)
- **walletPath**: Deployer keypair (default: `~/.config/solana/id.json`)
- **idlPathInAnchor**: IDL location after build (`anchor/target/idl/fair_credit.json`)
- **idlPathForCodama**: IDL location for code generation (`target/idl/fair_credit.json`)

### Deployment Steps

The deployment tool is modular with individual steps:

#### 1. Build (`steps/build.ts`)

Compiles the Anchor program:

```bash
cd anchor && anchor build
```

- Sets `ANCHOR_PROVIDER_URL` based on selected cluster
- Outputs compiled program to `anchor/target/deploy/`
- Generates IDL at `anchor/target/idl/fair_credit.json`

#### 2. Deploy (`steps/deploy.ts`)

Deploys the program to the selected cluster:

```bash
anchor deploy --provider.cluster <cluster>
```

- Uses wallet specified in `ANCHOR_WALLET` or config
- Deploys to cluster-specific RPC endpoint
- Updates program ID if deploying first time

#### 3. Update IDL (`steps/update-idl.ts`)

Copies IDL for Codama consumption:

```bash
cp anchor/target/idl/fair_credit.json target/idl/fair_credit.json
```

- Ensures Codama has access to latest IDL
- Required before running code generation

#### 4. Codegen (`steps/codegen.ts`)

Generates TypeScript client using Codama:

```bash
npm run gen:client  # Runs: npx codama run --all
```

- Reads `codama.json` configuration
- Generates type-safe client at `app/lib/solana/generated/`
- Creates instruction builders, account types, and PDA helpers

---

## 🏠 Local Development

### Full Local Setup

#### 1. Start Solana Test Validator

```bash
pnpm run validator
```

This starts a local validator with:

- Port: 8899
- Metaplex program cloned from mainnet (for NFT functionality)
- Quiet mode (minimal logging)
- Reset on each start (clean state)

**Command Details**:

```bash
solana-test-validator --reset --quiet \
  --clone-upgradeable-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  --url https://api.mainnet-beta.solana.com
```

#### 2. Deploy Program (Localnet)

```bash
pnpm run deploy
# Select: Localnet (validator)
# Select: Build + Deploy + Copy IDL + Run Codama (full pipeline)
```

#### 3. Start Frontend Development Server

```bash
pnpm run dev
```

Access the application at: **http://localhost:8888**

The frontend runs via Netlify Dev for serverless function support and environment variable management.

---

## 🌐 Devnet Deployment

### Prerequisites

1. **Fund Your Wallet**:

   ```bash
   solana airdrop 2  # On devnet
   ```

2. **Configure Solana CLI**:
   ```bash
   solana config set --url devnet
   ```

### Deploy to Devnet

```bash
pnpm run deploy
# Select: Devnet
# Select: Build + Deploy + Copy IDL + Run Codama
```

### Update Frontend Configuration

After deploying to devnet, update the frontend to use devnet:

**File**: `app/lib/solana/config.ts`

```typescript
export const SOLANA_NETWORK = "devnet"; // Change from 'localnet'
```

### Frontend Deployment

Deploy the Next.js app to Netlify:

```bash
cd app
pnpm run build
netlify deploy --prod
```

---

## 🔒 Mainnet Deployment

### ⚠️ Pre-Deployment Checklist

- [ ] Complete security audit of smart contract
- [ ] Test thoroughly on devnet with real users
- [ ] Verify all edge cases and error handling
- [ ] Set up monitoring and alerting
- [ ] Prepare upgrade/emergency plans
- [ ] Configure program upgrade authority
- [ ] Fund deployer wallet adequately (consider program size)

### Deploy to Mainnet

```bash
# 1. Configure Solana CLI for mainnet
solana config set --url mainnet-beta

# 2. Verify wallet has sufficient SOL
solana balance

# 3. Build and deploy
pnpm run deploy
# Select: Mainnet Beta
# Select: Build + Deploy + Copy IDL + Run Codama
```

### Post-Deployment

1. **Verify Program ID**:

   - Update `declare_id!()` in `anchor/programs/fair-credit/src/lib.rs`
   - Update `PROGRAM_ID` in `app/lib/solana/config.ts`

2. **Transfer Authority** (if using multisig):

   ```bash
   solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <MULTISIG>
   ```

3. **Initialize Hub** (if using curated registry):
   Run initialization scripts to set up Hub account and initial providers.

4. **Update Frontend**:
   - Set `SOLANA_NETWORK = 'mainnet-beta'` in config
   - Deploy to production hosting

---

## 🧪 Testing Before Deployment

### Run All Tests

```bash
# Anchor contract tests
pnpm run test:anchor

# Frontend integration tests
pnpm run test:app

# All tests
pnpm run test:full
```

### Program-Specific Tests

```bash
# Quick program tests
pnpm run test:program

# Security tests
pnpm run test:security
```

---

## 📁 Project Structure

```
FairCredit/
├── anchor/                        # Anchor workspace
│   ├── programs/fair-credit/      # Smart contract source
│   ├── target/                    # Build artifacts
│   │   ├── deploy/               # Compiled program (.so)
│   │   └── idl/                  # Generated IDL
│   └── Anchor.toml               # Anchor config
├── scripts/deploy/               # Deployment automation
│   ├── index.ts                  # Main entry point
│   ├── config.ts                 # Configuration
│   ├── prompts.ts                # Interactive prompts
│   └── steps/                    # Modular deployment steps
│       ├── build.ts             # Anchor build
│       ├── deploy.ts            # Program deployment
│       ├── update-idl.ts        # IDL copying
│       └── codegen.ts           # TypeScript client generation
├── app/                          # Next.js frontend
│   └── lib/solana/generated/     # Auto-generated client
├── target/idl/                   # IDL for Codama
└── codama.json                   # Codama configuration
```

---

## 🔑 Program Information

### Current Program ID

**Program ID**: `95asCfd7nbJN5i6REuiuLHj7Wb6DqqAKrhG1tRJ7Dthx`

This is the declared program ID in `lib.rs`. On first deployment to a new cluster, Anchor will deploy with this ID if the keypair exists at `anchor/target/deploy/fair_credit-keypair.json`.

### Important Accounts

**Hub Account** (Localnet example):

- Address: Derived from PDA `["hub", authority]`
- Authority: `~/.config/solana/id.json` (default Solana CLI wallet)
- Purpose: Curated registry of accepted providers and courses

**Provider Accounts**:

- PDA: `["provider", provider_authority]`
- Each educational institution has unique provider account
- Stores metadata, endorsers, and configuration

**Course Accounts**:

- PDA: `["course", hub, provider, creation_timestamp]`
- Timestamp-based uniqueness prevents collisions
- One course per unique timestamp per provider

**Credential Accounts**:

- PDA: `["credential", course, student_wallet]`
- One credential per student per course
- Links to NFT mint for asset representation

---

## 🛠️ Customizing Deployment

### Adding New Deployment Steps

To extend the deployment process (e.g., add verification, notifications):

1. **Create new step file**:

   ```typescript
   // scripts/deploy/steps/verify.ts
   export function verify(config: DeployConfig): void {
     // Your verification logic
   }
   ```

2. **Update `index.ts`**:

   ```typescript
   import { verify } from "./steps/verify";

   // Add to action choices and execution logic
   ```

### Environment Variables

Configure deployment via environment variables:

```bash
export ANCHOR_WALLET=/path/to/keypair.json
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com

pnpm run deploy
```

---

## 🔍 Troubleshooting

### Common Issues

**Issue**: "Program keypair not found"

- **Solution**: Ensure `anchor/target/deploy/fair_credit-keypair.json` exists
- Run `anchor build` first to generate it

**Issue**: "Insufficient funds for deployment"

- **Solution**: Fund your wallet:
  - Localnet: Funds are unlimited, just restart validator
  - Devnet: `solana airdrop 2`
  - Mainnet: Transfer SOL to deployer wallet

**Issue**: "Program ID mismatch"

- **Solution**: Update `declare_id!()` in `lib.rs` to match deployed program ID
  ```bash
  solana address -k anchor/target/deploy/fair_credit-keypair.json
  ```

**Issue**: "Codegen fails"

- **Solution**: Ensure IDL is up-to-date:
  ```bash
  cd anchor && anchor build && cd ..
  cp anchor/target/idl/fair_credit.json target/idl/fair_credit.json
  pnpm run gen:client
  ```

### Logs and Debugging

**View program logs** (during deployment):

```bash
solana logs <PROGRAM_ID>
```

**View transaction details**:

```bash
solana confirm -v <TRANSACTION_SIGNATURE>
```

**Check program account**:

```bash
solana program show <PROGRAM_ID>
```

---

## 📚 Additional Resources

- **Deployment Scripts**: [scripts/deploy/README.md](./scripts/deploy/README.md)
- **Implementation Log**: [docs/logs/](./docs/logs/)
- **Anchor Documentation**: https://anchor-lang.com
- **Solana CLI Guide**: https://docs.solana.com/cli

---

## 🔄 Upgrade Process

### Upgrading Program

1. **Make changes** to smart contract in `anchor/programs/fair-credit/src/`

2. **Test thoroughly** on localnet/devnet

3. **Deploy upgrade**:

   ```bash
   pnpm run deploy
   # Select target cluster
   # Select: Build + Deploy + Copy IDL + Run Codama
   ```

4. **Update frontend**:
   - Frontend automatically uses new IDL after codegen
   - Test with new client types
   - Deploy updated frontend

### Migration Considerations

- **Account Structure Changes**: May require migration scripts
- **Breaking Changes**: Communicate with users, plan transition
- **Upgrade Authority**: Ensure proper authority management on mainnet

---

_This deployment guide is current as of February 2026. For the latest updates, see the deployment scripts and README in `scripts/deploy/`._ 🚀
