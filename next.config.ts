import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      {
        protocol: "https",
        hostname: "www.themoviedb.org",
        pathname: "/assets/**",
      },
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
    ],
  },
};

export default nextConfig;
