import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allow dev requests from additional origins used in your network.
  // 172.17.112.1 - shown in Next.js dev logs
  // 192.168.137.1 - IP you shared (e.g. hotspot / LAN IP
  // If you prefer to allow all origins during development, you can instead use:
  // allowedDevOrigins: "all",
};

export default nextConfig;
