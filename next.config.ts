import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
      { protocol: "https", hostname: "pbcdnw.aoneroom.com" },
      { protocol: "https", hostname: "pbcdn.aoneroom.com" },
      { protocol: "https", hostname: "pacdn.aoneroom.com" },
      { protocol: "https", hostname: "h5-static.aoneroom.com" },
      { protocol: "https", hostname: "macdn.aoneroom.com" },
      { protocol: "https", hostname: "spa.aoneroom.com" },
      { protocol: "https", hostname: "movibox.net" },
      { protocol: "https", hostname: "sbcdnw.hakunaymatata.com" },
      { protocol: "https", hostname: "bcdnxw.hakunaymatata.com" },
      { protocol: "https", hostname: "cacdn.hakunaymatata.com" },
    ],
  },
};

export default nextConfig;
