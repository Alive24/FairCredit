/**
 * Copy IDL file from target/idl to public directory for client-side access.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const idlSource = path.join(repoRoot, "target/idl/fair_credit.json");
const idlDest = path.join(repoRoot, "app/public/fair_credit.json");

if (!fs.existsSync(idlSource)) {
  console.warn(
    `IDL file not found at ${idlSource}. Skipping copy. Run 'anchor build' first.`,
  );
  process.exit(0);
}

const publicDir = path.dirname(idlDest);
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.copyFileSync(idlSource, idlDest);
console.log(`Copied IDL from ${idlSource} to ${idlDest}`);
