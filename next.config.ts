import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/cineplex-vod/:path*",
        destination: "http://vod.cineplexbd.net:8081/:path*",
      },
      {
        source: "/cineplex-assets/:path*",
        destination: "http://cineplexbd.net/:path*",
      },
    ];
  },
};

export default nextConfig;
