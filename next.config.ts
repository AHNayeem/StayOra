import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Hero and card imagery is sourced from Unsplash during design build-out.
    // Swap these patterns for your own asset host when wiring real data.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
