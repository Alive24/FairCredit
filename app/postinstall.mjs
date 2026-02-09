import path from "node:path";
import { existsSync, cpSync, rmSync } from "node:fs";

const publicTinymcePath = path.join(process.cwd(), "public", "tinymce");
const tinymceSourcePath = path.join(process.cwd(), "node_modules", "tinymce");

try {
  if (existsSync(publicTinymcePath)) {
    rmSync(publicTinymcePath, { recursive: true, force: true });
  }
  cpSync(tinymceSourcePath, publicTinymcePath, { recursive: true });
  console.info("TinyMCE copied to public directory");
} catch (error) {
  console.error("Error copying TinyMCE:", error?.message ?? String(error));
}
