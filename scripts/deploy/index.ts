#!/usr/bin/env npx tsx
/**
 * Interactive deployment tool: build program, deploy to cluster, update IDL, run codegen.
 * Modular so you can add more steps (e.g. verify, notify) later.
 *
 * Usage: npx tsx scripts/deploy/index.ts
 *    or: pnpm run deploy (if added to package.json)
 */

import { createInterface, choose } from "./prompts";
import { getDefaultConfig, type Cluster } from "./config";
import { build } from "./steps/build";
import { deploy } from "./steps/deploy";
import { updateIdl } from "./steps/update-idl";
import { codegen } from "./steps/codegen";

type Action =
  | "build"
  | "build_deploy"
  | "build_deploy_idl"
  | "build_deploy_idl_codegen"
  | "idl_codegen_only";

async function main() {
  const rl = createInterface();

  console.log("\n FairCredit — Interactive Deploy\n");

  const cluster = await choose<Cluster>(rl, "Target cluster:", [
    { value: "localnet", label: "Localnet (validator)" },
    { value: "devnet", label: "Devnet" },
    { value: "mainnet-beta", label: "Mainnet Beta" },
  ]);

  const action = await choose<Action>(rl, "What do you want to run?", [
    { value: "build", label: "Build only (anchor build)" },
    { value: "build_deploy", label: "Build + Deploy program" },
    {
      value: "build_deploy_idl",
      label: "Build + Deploy + Copy IDL to target/idl",
    },
    {
      value: "build_deploy_idl_codegen",
      label: "Build + Deploy + Copy IDL + Run Codama (full pipeline)",
    },
    {
      value: "idl_codegen_only",
      label: "Copy IDL + Codegen only (IDL already built)",
    },
  ]);

  rl.close();

  const config = getDefaultConfig(cluster);

  try {
    if (action === "build" || action.startsWith("build_deploy")) {
      console.log("\n Building...\n");
      build(config);
    }

    if (
      action === "build_deploy" ||
      action === "build_deploy_idl" ||
      action === "build_deploy_idl_codegen"
    ) {
      console.log("\n Deploying...\n");
      deploy(config);
    }

    if (
      action === "build_deploy_idl" ||
      action === "build_deploy_idl_codegen" ||
      action === "idl_codegen_only"
    ) {
      console.log("\n Copying IDL...\n");
      updateIdl(config);
      console.log(" Running codegen...\n");
      codegen(config);
    }

    console.log("\n Done.\n");
  } catch (err) {
    console.error("\n Error:", err);
    process.exit(1);
  }
}

main();
