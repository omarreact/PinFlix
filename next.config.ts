import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pbcdnw.aoneroom.com" },
      { protocol: "https", hostname: "pbcdn.aoneroom.com" },
      { protocol: "https", hostname: "pacdn.aoneroom.com" },
      { protocol: "https", hostname: "h5-static.aoneroom.com" },
      { protocol: "https", hostname: "macdn.aoneroom.com" },
      { protocol: "https", hostname: "spa.aoneroom.com" },
      { protocol: "https", hostname: "movibox.net" },
    ],
  },
};

export default nextConfig;
