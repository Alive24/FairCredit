/**
 * Copy built IDL to the path expected by Codama (repo root target/idl).
 */

import * as fs from "fs";
import * as path from "path";
import type { DeployConfig } from "../config";

export function updateIdl(config: DeployConfig): void {
  const src = path.join(config.anchorRoot, config.idlPathInAnchor);
  const destDir = path.join(
    config.repoRoot,
    path.dirname(config.idlPathForCodama),
  );
  const dest = path.join(config.repoRoot, config.idlPathForCodama);

  if (!fs.existsSync(src)) {
    throw new Error(`IDL not found at ${src}. Run build first (anchor build).`);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
}
