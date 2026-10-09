import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.PINFLIX_DEPLOY_TARGET === "cpanel" ? undefined : "standalone",
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ] }];
  },
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
