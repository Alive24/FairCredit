/** @type {import('next').NextConfig} */
import nextra from "nextra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const withNextra = nextra({
  contentDirBasePath: "/docs",
});

export default withNextra({
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore pino-pretty in browser builds (it's Node.js only)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        "pino-pretty": false,
      };
    }
    return config;
  },
  turbopack: {
    // Treat the monorepo root as the workspace root so Next can find `next` from app/app.
    root: path.join(__dirname, ".."),
    resolveAlias: {
      "next-mdx-import-source-file": "./mdx-components.ts",
    },
  },
});
