# Miz · gerador de pedidos — imagem para o EasyPanel
# Next.js em modo standalone + Chromium (headless shell) para gerar os PDFs.

ARG NODE_VERSION=22
ARG PLAYWRIGHT_VERSION=1.64.1

# ---------------------------------------------------------------- dependências
FROM node:${NODE_VERSION}-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------------------------------------------------------------- build
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app
# Públicas por definição (vão para o navegador). Podem ser trocadas por "build args" no EasyPanel.
ARG NEXT_PUBLIC_SUPABASE_URL=https://kfwbbmscqpleyiyusrkk.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_70ZwuLcqbzM9BSoeg5jXXQ_Bv07d8xy
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------- execução
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ARG PLAYWRIGHT_VERSION
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=America/Sao_Paulo \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Chromium headless + bibliotecas do sistema e fontes de que ele precisa
RUN npx -y playwright@${PLAYWRIGHT_VERSION} install --with-deps --only-shell chromium \
    && rm -rf /var/lib/apt/lists/* /root/.npm

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

USER node
EXPOSE 3000
CMD ["node", "server.js"]
