import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // D-15 : zones privées jamais indexées (en plus de robots.txt).
  // Sources littérales, couvertes par un test contre PRIVATE_PREFIXES.
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    return [
      "/espace-client/:path*",
      "/espace-client",
      "/admin/:path*",
      "/admin",
      "/connexion",
      "/auth/:path*",
    ].map((source) => ({ source, headers: noindex }));
  },
};

export default nextConfig;
