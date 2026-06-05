import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Required for youtubei.js and mammoth which use Node.js built-ins
  serverExternalPackages: ["youtubei.js", "mammoth"],
};

export default nextConfig;
