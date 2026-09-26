# ---------- base ----------
FROM node:24-alpine AS base
WORKDIR /app

# ---------- deps: todas as dependências (inclui dev, para compilar) ----------
FROM base AS deps
COPY package.json package-lock.json ./
# --ignore-scripts: nenhuma dependência precisa de script de instalação
# (o bcrypt já traz binário pronto para Alpine/musl em prebuilds/).
RUN npm ci --ignore-scripts

# ---------- build: compila o TypeScript ----------
FROM deps AS build
COPY . .
RUN npm run build

# ---------- prod-deps: somente dependências de produção ----------
FROM base AS prod-deps
COPY package.json package-lock.json ./
# --omit=optional tira o typescript (peer opcional do @nestjs/swagger) e o pg-cloudflare,
# que não são usados em runtime.
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force

# ---------- runtime: imagem final ----------
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/app/uploads \
    DB_PASSWORD=68fe78cfa0ce2d43cecffdfd4b82bfecdd01a9418287a549 \
    JWT_SECRET=dfshubwufweeubejbe7332b23

# Código e dependências ficam como root (somente leitura para a app);
# apenas a pasta de uploads pertence ao usuário "node".
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
# Build do frontend (opcional). Se public/ tiver index.html, a API serve a SPA.
COPY public ./public

RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node

EXPOSE 3000

# Usa o próprio Node (fetch nativo), sem depender de curl/wget nem de shell.
# /api/health só responde 200 se o banco estiver acessível.
# start-period cobre as tentativas de reconexão ao banco no boot (até ~60s).
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health',{signal:AbortSignal.timeout(4000)}).then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "dist/main"]
