import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  // Required for pdf-parse and youtubei.js which use Node.js built-ins
  serverExternalPackages: ["pdf-parse", "youtubei.js", "mammoth"],
};

export default nextConfig;
