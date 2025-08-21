/** @type {import('next').NextConfig} */
const path = require("path");
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // We may use the App Router by default; leave experimental off unless needed
  },
  images: {
    // Allow serving images from configured CDN/domain if provided
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_CDN_HOST || "*",
      },
    ],
  },
  webpack: (config) => {
    // Ensure TS path alias "@/*" -> "src/*" resolves in webpack
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(__dirname, "src"),
      "@/": path.resolve(__dirname, "src/"),
    };
    return config;
  },
};
module.exports = nextConfig;
