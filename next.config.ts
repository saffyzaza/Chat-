import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['@google/generative-ai', 'mammoth'],
};



export default nextConfig;
