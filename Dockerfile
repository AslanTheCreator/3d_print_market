FROM node:24.15.0-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=https://figurzilla.ru/internal-api/v1
ARG CLIENT_API_BASE_URL=https://figurzilla.ru/internal-api/v1
ARG API_BASE_URL=https://figurzilla.ru/internal-api/v1

ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV CLIENT_API_BASE_URL=$CLIENT_API_BASE_URL
ENV API_BASE_URL=$API_BASE_URL

# Копируем package files
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Копируем исходники и собираем
COPY . .
RUN npm run build

# Production stage
FROM node:24.15.0-alpine AS runner

WORKDIR /app

ARG APP_VERSION=dev
ARG VCS_REF=unknown

LABEL org.opencontainers.image.title="Figurzilla frontend" \
      org.opencontainers.image.source="https://github.com/AslanTheCreator/3d_print_market" \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.revision=$VCS_REF

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Копируем только необходимое для standalone
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

EXPOSE 3000

# Переменная окружения по умолчанию (DevOps переопределит)
ENV API_BASE_URL=""
ENV CLIENT_API_BASE_URL=""
ENV NEXT_PUBLIC_API_URL=""
ENV ALLOW_LOCAL_API_URL=false

# Запускаем напрямую через node
USER node

CMD ["node", "server.js"]
