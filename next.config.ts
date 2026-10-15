import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build enxuto para o contêiner do EasyPanel (node server.js)
  output: "standalone",
  // O Chromium do gerador de PDF roda fora do bundle
  serverExternalPackages: ["playwright-core"],
  // O rastreio do standalone deixa de fora arquivos que o playwright-core lê em tempo de execução
  // (ex.: browsers.json): inclui o pacote inteiro
  outputFileTracingIncludes: {
    "/simulacoes/*/pdf": ["./node_modules/playwright-core/**/*"],
  },
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
