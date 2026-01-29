/**
 * Run Codama to regenerate the app client from the IDL.
 */

import { execSync } from "child_process";
import type { DeployConfig } from "../config";

export function codegen(config: DeployConfig): void {
  execSync("npm run gen:client", {
    cwd: config.repoRoot,
    stdio: "inherit",
  });
}
