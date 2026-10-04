import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pbcdnw.aoneroom.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "pbcdn.aoneroom.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "macdn.aoneroom.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
