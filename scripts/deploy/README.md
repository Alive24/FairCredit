# FairCredit Deploy Tool

Interactive deployment tool: build program, deploy to cluster, copy IDL, run codegen.

## Usage

From repo root:

```bash
pnpm run deploy
# or
npx tsx scripts/deploy/index.ts
```

## Flow

1. **Target cluster**: localnet / devnet / mainnet-beta
2. **Action**:
   - Build only
   - Build + Deploy
   - Build + Deploy + Copy IDL
   - Build + Deploy + Copy IDL + Codegen (full pipeline)
   - Copy IDL + Codegen only (when IDL already built)

## Modules

- `config.ts` — cluster, paths, wallet
- `steps/build.ts` — `anchor build`
- `steps/deploy.ts` — `anchor deploy --provider.cluster <cluster>`
- `steps/update-idl.ts` — copy `anchor/target/idl/fair_credit.json` → `target/idl/fair_credit.json` (for Codama)
- `steps/codegen.ts` — `npm run gen:client`
- `prompts.ts` — interactive prompts (readline)
- `index.ts` — main flow

To add new steps (e.g. verify, notify), add a step file and wire it in `index.ts`.
