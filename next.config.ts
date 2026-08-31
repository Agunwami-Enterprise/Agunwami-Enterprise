import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['agunwami-backend'],
  devIndicators: false,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
