import path from "node:path";
import {
  copyFileSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  unlinkSync,
} from "node:fs";

const publicTinymcePath = path.join(process.cwd(), "public", "tinymce");
const tinymceSourcePath = path.join(process.cwd(), "node_modules", "tinymce");

function statIfExists(filePath) {
  try {
    return lstatSync(filePath);
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function copyDirectoryRecursive(sourceDir, targetDir) {
  mkdirSync(targetDir, { recursive: true });

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      symlinkSync(readlinkSync(sourcePath), targetPath);
      continue;
    }

    copyFileSync(sourcePath, targetPath);
  }
}

try {
  const resolvedSourcePath = realpathSync(tinymceSourcePath);

  const destinationStats = statIfExists(publicTinymcePath);
  if (destinationStats) {
    if (destinationStats.isSymbolicLink()) {
      unlinkSync(publicTinymcePath);
    } else {
      rmSync(publicTinymcePath, { recursive: true, force: true });
    }
  }

  mkdirSync(path.dirname(publicTinymcePath), { recursive: true });
  copyDirectoryRecursive(resolvedSourcePath, publicTinymcePath);

  // Ensure destination is a real directory, not a symlink.
  if (lstatSync(publicTinymcePath).isSymbolicLink()) {
    throw new Error("public/tinymce must be a directory, got symlink");
  }

  console.info("TinyMCE copied to public directory");
} catch (error) {
  console.error("Error copying TinyMCE:", error?.message ?? String(error));
  process.exitCode = 1;
}
