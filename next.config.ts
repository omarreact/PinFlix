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
        hostname: "macdn.aoneroom.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "h5-static.aoneroom.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
