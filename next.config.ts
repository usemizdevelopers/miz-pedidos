import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O Chromium do gerador de PDF roda fora do bundle
  serverExternalPackages: ["playwright-core"],
  // O indicador de desenvolvimento apareceria dentro dos PDFs gerados em dev
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
