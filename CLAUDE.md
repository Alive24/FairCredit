# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Building the Project
```bash
anchor build                    # Build the Solana program
npm run lint                   # Check code formatting
npm run lint:fix              # Fix code formatting issues
```

### Testing
```bash
npm test                       # Run full test suite (slower, requires built program)
npm run test:fast              # Run fast tests using LiteSVM (skips standard tests)
npm run test:security          # Run security-focused tests only
npm run dev                    # Alias for test:fast (development workflow)
```

### Local Development
```bash
npm run validator              # Start local Solana test validator
solana-test-validator --reset --quiet  # Alternative validator start command
```

**Important**: Always run `anchor build` before running tests that require the deployed program binary.

## Project Architecture

### High-Level Overview
FairCredit is a Solana-based academic credential verification protocol built with Anchor framework. The system implements a decentralized provider registration model where educational providers can issue blockchain-verified credentials without pre-approval, while individual verifiers maintain their own trust assessments.

### Key Architectural Components

**Solana Program Structure (`programs/fair-credit/`):**
- `lib.rs` - Main program entry point with instruction handlers
- `handlers/` - Business logic for all program instructions
- `state/` - Account state definitions (Provider, Verifier, Credential, etc.)
- `types/` - Custom types, errors, and data structures

**Core State Models:**
- **Provider**: Educational institutions that issue credentials (immediate registration, no approval required)
- **Verifier**: Independent entities that assess provider trustworthiness individually
- **ProviderAssessment**: Verifier-specific evaluations of providers (suspension status, reputation scores)
- **Credential**: Blockchain-backed academic achievements (to be implemented)

**Testing Infrastructure:**
- Hybrid testing approach using LiteSVM for fast functional tests and standard Anchor for security tests
- Test configuration supports skipping standard tests for development speed (`SKIP_STANDARD=true`)

### Program Instructions Currently Implemented
- `initialize_provider` - Register new educational provider
- `initialize_verifier` - Register new credential verifier  
- `suspend_provider` - Verifier suspends a provider in their assessment
- `unsuspend_provider` - Verifier removes suspension from provider
- `set_provider_reputation` - Verifier sets reputation score (0-100) for provider

### Development Patterns

**Account Space Calculation:**
Provider accounts use realistic string length limits:
- Name: 50 chars, Description: 200 chars, Website: 100 chars, Email: 50 chars

**PDA (Program Derived Address) Seeds:**
- Provider: `["provider", provider_wallet]`
- Verifier: `["verifier", verifier_wallet]`

**Key Design Principles:**
- Open provider registration (no gatekeeping)
- Verifier-centric trust model (individual assessments vs global reputation)
- Decentralized governance with contract author override authority

### Technology Stack
- **Blockchain**: Solana with Anchor framework (Rust)
- **Testing**: TypeScript with Mocha/Chai, LiteSVM for fast tests
- **Dependencies**: anchor-lang 0.31.1, Solana Web3.js

### Development Workflow
1. Build program: `anchor build`
2. Run fast tests during development: `npm run dev`
3. Run full test suite before commits: `npm test`
4. Use local validator for integration testing: `npm run validator`

### File Organization
- `/programs/fair-credit/` - Solana program source code
- `/tests/` - TypeScript test files
- `/target/` - Build artifacts (generated)
- `/test-ledger/` - Local validator data (generated)
- `FairCredit_PRD.txt` - Complete product requirements document
- `Anchor.toml` - Anchor framework configuration

### Testing Notes
The test suite uses a hybrid approach for performance:
- LiteSVM for fast functional testing during development
- Standard Anchor testing for comprehensive security validation
- Program ID: `BtaUG6eQGGd5dPMoGfLtc6sKLY3rsmq9w8q9cWyipwZk`

### Implementation Status
Currently implements the provider registration and verifier assessment system. Credential issuance, endorsement workflows, and NFT minting are planned for future implementation phases as outlined in the PRD.