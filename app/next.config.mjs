/** @type {import('next').NextConfig} */
import nextra from "nextra";

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
    resolveAlias: {
      "next-mdx-import-source-file": "./mdx-components.ts",
    },
  },
});
