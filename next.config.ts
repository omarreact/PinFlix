import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/cineplex-vod/:path*",
        destination: "http://vod.cineplexbd.net:8081/:path*",
      },
      {
        source: "/cineplex-origin/:path*",
        destination: "http://cineplexbd.net/:path*",
      },
    ];
  },
};

export default nextConfig;
