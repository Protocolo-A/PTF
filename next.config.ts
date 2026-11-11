import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Direcciones IP permitidas para desarrollo local
  allowedDevOrigins: [
    "192.168.56.1",
    "192.168.0.3",
  ],

  output:
    process.env.DEVFOLIO_DOCKER_BUILD === "true"
      ? "standalone"
      : undefined,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "Accept-CH", value: "Sec-CH-UA-Platform, Sec-CH-UA-Model, Sec-CH-UA-Mobile" },
        { key: "Permissions-Policy", value: "geolocation=(self)" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    }];
  },
};

export default nextConfig;