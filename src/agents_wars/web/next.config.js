/** @type {import('next').NextConfig} */
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
};
module.exports = nextConfig;
